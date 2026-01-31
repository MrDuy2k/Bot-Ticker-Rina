/////////////// STARTUP FLAGS ///////////////
const flags = [
    // Chỉnh sửa các flag ở đây khi không thể thêm flag trực tiếp trong command prompt.
    // PTERODACTYL PANEL
    // Thêm các startup flag ở đây (ví dụ: "--no-compile") khi chạy qua panel
]
process.argv.push(...flags)
/////////////// STARTUP FLAGS ///////////////

/*
 ██████╗ ██╗   ██╗██╗   ██╗██████╗ ██╗  ██╗██╗███╗   ██╗███╗   ███╗ ██████╗ 
 ██╔══██╗██║   ██║██║   ██║██╔══██╗██║ ██╔╝██║████╗ ██║████╗ ████║██╔════╝ 
 ██████╔╝██║   ██║██║   ██║██████╔╝█████╔╝ ██║██╔██╗ ██║██╔████╔██║██║  ███╗
 ██╔═══╝ ██║   ██║██║   ██║██╔══██╗██╔═██╗ ██║██║╚██╗██║██║╚██╔╝██║██║   ██║
 ██║     ╚██████╔╝╚██████╔╝██║  ██║██║  ██╗██║██║ ╚████║██║ ╚═╝ ██║╚██████╔╝
 ╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝ 
 v4.1.1 - Được phát triển bởi PumpkinMC NetWork & Các cộng tác viên

 Discord: https://discord.pumpkinmc.net
 Tài liệu: https://docs.pumpkinmc.net
 Ủng hộ chúng tôi: https://github.com/sponsors/PumpkinMC-NetWork
 Website: https://pumpkinmc.net
 IP Minecraft: play.pumpkinmc.net
 
 */
///////////////////////////////////////////
////////// BIÊN DỊCH + KHỞI ĐỘNG /////////
///////////////////////////////////////////
const fs = require("fs")
const ts = require("typescript")
const {createHash,Hash} = require("crypto")
const nodepath = require('path')

/** ## Đây là gì?
 * Đây là một hàm so sánh thư mục `./src/` với hash được lưu trữ trong file `./dist/hash.txt`.
 * Hash này được tính toán dựa trên ngày sửa đổi cuối cùng và metadata của tất cả các file trong `./src/`.
 * 
 * Nếu hash khác nhau, bot sẽ tự động biên dịch lại toàn bộ mã nguồn.
 * Cơ chế này giúp tiết kiệm tài nguyên CPU vì bot sẽ không biên dịch lại khi không có bất kỳ thay đổi nào :)
 * 
 * @param {string} dir - Đường dẫn thư mục cần tính hash
 * @param {Hash|null} upperHash - Hash cha (dùng khi gọi đệ quy)
 */
function computeSourceHash(dir, upperHash){
    const hash = upperHash ? upperHash : createHash("sha256")
    const info = fs.readdirSync(dir, {withFileTypes: true})
    
    for (const file of info) {
        const fullPath = nodepath.join(dir, file.name)
        if (file.isFile() && [".js",".ts",".jsx",".tsx"].some((ext) => file.name.endsWith(ext))){
            const statInfo = fs.statSync(fullPath)
            // Tính hash dựa trên metadata của file (đường dẫn, kích thước, thời gian sửa đổi)
            const fileInfo = `\( {fullPath}: \){statInfo.size}:${statInfo.mtimeMs}`
            hash.update(fileInfo)
            
        } else if (file.isDirectory()){
            // Đệ quy vào tất cả các thư mục con
            computeSourceHash(fullPath, hash)
        }
    }
    // Chỉ trả về giá trị hash khi không phải gọi đệ quy
    if (!upperHash) {
        return hash.digest("hex")
    }
}

/** Kiểm tra xem có cần biên dịch lại hay không */
function requiresCompilation(){
    // Luôn biên dịch khi sử dụng flag "--compile-only"
    if (process.argv.includes("--compile-only")) return true

    console.log("PumpkinMC NetWork: Đang so sánh bản build cũ với mã nguồn hiện tại...")
    const sourceHash = computeSourceHash("./src/")
    const pluginHash = computeSourceHash("./plugins/")
    const hash = sourceHash + ":" + pluginHash

    if (fs.existsSync("./dist/hash.txt")){
        const distHash = fs.readFileSync("./dist/hash.txt").toString().trim()
        if (distHash === hash) return false
        else return true
    } else return true
}

/** Lưu hash mới sau khi biên dịch thành công */
function saveNewCompilationHash(){
    const sourceHash = computeSourceHash("./src/")
    const pluginHash = computeSourceHash("./plugins/")
    const hash = sourceHash + ":" + pluginHash
    fs.writeFileSync("./dist/hash.txt", hash)
}

// ==================== QUÁ TRÌNH BIÊN DỊCH ====================
if (!process.argv.includes("--no-compile")){
    if (requiresCompilation()){
        console.log("PumpkinMC NetWork: Phát hiện thay đổi → Cần biên dịch lại mã nguồn...")

        // XÓA TOÀN BỘ BUILD CŨ
        console.log("PumpkinMC NetWork: Đang xóa các file build cũ trong thư mục ./dist...")
        fs.rmSync("./dist", {recursive: true, force: true})

        // BIÊN DỊCH TYPESCRIPT SANG JAVASCRIPT
        console.log("PumpkinMC NetWork: Đang biên dịch TypeScript...")
        const configPath = nodepath.resolve('./tsconfig.json')
        const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

        // Kiểm tra lỗi cấu hình tsconfig.json
        if (configFile.error){
            const message = ts.formatDiagnosticsWithColorAndContext([configFile.error], ts.createCompilerHost({}))
            console.error(message)
            process.exit(1)
        }

        // Phân tích nội dung tsconfig.json
        const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, nodepath.dirname(configPath))

        // Tạo chương trình biên dịch TypeScript
        const program = ts.createProgram({
            rootNames: parsedConfig.fileNames,
            options: parsedConfig.options
        })

        // Thực hiện quá trình emit (xuất file .js)
        const emitResult = program.emit()

        // In ra tất cả lỗi và cảnh báo trong quá trình biên dịch
        const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)
        const formattedDiagnostics = ts.formatDiagnosticsWithColorAndContext(allDiagnostics, ts.createCompilerHost(parsedConfig.options))
        console.log(formattedDiagnostics)

        // Nếu có lỗi nghiêm trọng hoặc quá trình emit bị bỏ qua → dừng bot
        if (emitResult.emitSkipped || allDiagnostics.some(d => d.category === ts.DiagnosticCategory.Error)){
            console.log("PumpkinMC NetWork: Biên dịch thất bại! Bot sẽ dừng lại.")
            process.exit(1)
        }

        console.log("PumpkinMC NetWork: Biên dịch TypeScript thành công!")
    } else {
        console.log("PumpkinMC NetWork: Mã nguồn không thay đổi → Bỏ qua bước biên dịch.")
    }

    // Lưu hash mới sau khi biên dịch (hoặc bỏ qua biên dịch)
    saveNewCompilationHash()
} else {
    console.log("PumpkinMC NetWork: Đã tắt chế độ biên dịch (--no-compile).")
}

// ==================== KHỞI ĐỘNG BOT ====================
console.log("PumpkinMC NetWork: Quá trình biên dịch hoàn tất!")
if (process.argv.includes("--compile-only")) {
    console.log("PumpkinMC NetWork: Chỉ yêu cầu biên dịch (--compile-only) → Thoát chương trình.")
    process.exit(0)
}

console.log("PumpkinMC NetWork: Đang khởi động bot ticket...")
require("./dist/src/index.js")