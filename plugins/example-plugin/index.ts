import {api, opendiscord, utilities} from "#opendiscord"
import * as discord from "discord.js"

/////////////////////////////////////////////
//// Plugin này chưa được bật!           ////
//// Vui lòng bật nó trong file plugin.json! ////
/////////////////////////////////////////////

if (utilities.project != "openticket") 
    throw new api.ODPluginError("Plugin này chỉ hoạt động trên hệ thống PumpkinMC NetWork (Open Ticket)!")

// Thêm hỗ trợ tự động hoàn thành TypeScript cho dữ liệu plugin (TÙY CHỌN - NÊN GIỮ LẠI)
declare module "#opendiscord-types" {
    export interface ODPluginManagerIds_Default {
        "example-plugin": api.ODPlugin
    }
    export interface ODConfigManagerIds_Default {
        "example-plugin:config": api.ODJsonConfig
    }
}

// Đăng ký cấu hình mẫu để tất cả plugin và hệ thống đều có thể sử dụng
opendiscord.events.get("onConfigLoad").listen((configManager) => {
    configManager.add(
        new api.ODJsonConfig(
            "example-plugin:config",           // ID của cấu hình
            "config.json",                        // Tên file cấu hình
            "./plugins/example-plugin/"        // Thư mục chứa file cấu hình
        )
    )

    // Ghi log ra console để xác nhận cấu hình đã được tải thành công
    const ourConfig = configManager.get("example-plugin:config")
    opendiscord.log("Cấu hình plugin mẫu đã được tải thành công!", "plugin", [
        {key: "biến-1", value: ourConfig.data.testVariable1},
        {key: "biến-2", value: ourConfig.data.testVariable2.toString()},
        {key: "biến-3", value: ourConfig.data.testVariable3.toString()}
    ])
})

// Sự kiện khi người chơi ấn nút tạo ticket
opendiscord.events.get("onTicketCreate").listen((creator) => {
    opendiscord.log("Đang tạo ticket mới cho thành viên...", "plugin", [
        {key: "Người tạo", value: creator.tag},  // Đã sửa: bỏ .user
        {key: "ID", value: creator.id}           // Đã sửa: bỏ .user
    ])
})

// Sự kiện sau khi ticket được tạo thành công
opendiscord.events.get("afterTicketCreated").listen((ticket, creator, channel) => {
    opendiscord.log("Ticket đã được tạo thành công!", "plugin", [
        {key: "Chủ ticket", value: creator.tag}, // Đã sửa: bỏ .user
        {key: "Kênh ticket", value: channel.name},
        {key: "ID kênh", value: channel.id},
        {key: "Website", value: "https://pumpkinmc.net"},
        {key: "IP Server", value: "play.pumpkinmc.net"}
    ])
})
