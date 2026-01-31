/*
   ██████╗ ██████╗ ███████╗███╗   ██╗    ████████╗██╗ ██████╗██╗  ██╗███████╗████████╗  
  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║    ╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝  
  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║       ██║   ██║██║     █████╔╝ █████╗     ██║     
  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║       ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║     
  ╚██████╔╝██║     ███████╗██║ ╚████║       ██║   ██║╚██████╗██║  ██╗███████╗   ██║     
   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝       ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝     
                                                                       
    > Optimized for: PumpkinMC NetWork
    > Translation: Vietnamese (Tiếng Việt)
    
    THÔNG TIN:
    ============
    Open Ticket v4.1.1 - Chỉnh sửa cho PumpkinMC NetWork
    
    Hỗ trợ: https://github.com/sponsors/DJj123dj
    Discord gốc: https://discord.dj-dj.be
    Website gốc: https://openticket.dj-dj.be
    Tài liệu: https://otdocs.dj-dj.be

    Cấu hình tại:
    ./config/....json

    Nếu gặp lỗi, hãy kiểm tra file ./otdebug.txt!
*/

// Khởi tạo API & kiểm tra các thư viện npm
import { api, opendiscord, utilities } from "./core/startup/init"
export { api, opendiscord, utilities } from "./core/startup/init"
import ansis from "ansis"

/** Quy trình khởi động chính của PumpkinMC Ticket System. Chạy bất đồng bộ (`async`) */
const main = async () => {
    // 1. Tải tất cả các sự kiện (Events)
    (await import("./data/framework/eventLoader.js")).loadAllEvents()

    // 2. Hệ thống xử lý lỗi (Error Handling)
    process.on("uncaughtException",async (error,origin) => {
        try{
            await opendiscord.events.get("onErrorHandling").emit([error,origin])
            if (opendiscord.defaults.getDefault("errorHandling")){
                // Thông báo lỗi tùy chỉnh cho các lỗi phổ biến
                if (error.message.toLowerCase().includes("used disallowed intents")){
                    // Lỗi chưa bật Intents
                    opendiscord.log("[PumpkinMC] Lỗi: Bot không thể chạy nếu thiếu 'Privileged Gateway Intents'!","error")
                    opendiscord.log("Hãy bật chúng trong Discord Developer Portal (mục Bot)!","info")
                    console.log("\n")
                    process.exit(1)
                }else if (error.message.toLowerCase().includes("invalid discord bot token provided")){
                    // Lỗi sai Token
                    opendiscord.log("[PumpkinMC] Lỗi: Token Discord Bot không hợp lệ!","error")
                    opendiscord.log("Vui lòng kiểm tra lại file config và đảm bảo Token đã chính xác.","info")
                    console.log("\n")
                    process.exit(1)
                }else{
                    // Lỗi không xác định (In ra file debug)
                    const errmsg = new api.ODError(error,origin)
                    opendiscord.log(errmsg)
                    if (opendiscord.defaults.getDefault("crashOnError")) process.exit(1)
                    await opendiscord.events.get("afterErrorHandling").emit([error,origin,errmsg])
                }
            }
            
        }catch(err){
            console.log("[LỖI TRONG BỘ XỬ LÝ LỖI]:",err)
        }
    })

    // 3. Xử lý di chuyển dữ liệu (Migration - Phần 1)
    const lastVersion = await (await import("./core/startup/manageMigration.js")).loadVersionMigrationSystem()

    // 4. Tải Plugins
    if (opendiscord.defaults.getDefault("pluginLoading")){
        await (await import("./core/startup/pluginLauncher.js")).loadAllPlugins()
    }
    await opendiscord.events.get("afterPluginsLoaded").emit([opendiscord.plugins])
    
    // 5. Tải các lớp Plugin (Plugin Classes)
    opendiscord.log("[PumpkinMC] Đang tải các lớp Plugin...","system")
    if (opendiscord.defaults.getDefault("pluginClassLoading")){

    }
    await opendiscord.events.get("onPluginClassLoad").emit([opendiscord.plugins.classes,opendiscord.plugins])
    await opendiscord.events.get("afterPluginClassesLoaded").emit([opendiscord.plugins.classes,opendiscord.plugins])

    // 6. Tải các cờ cài đặt (Flags)
    opendiscord.log("[PumpkinMC] Đang tải các cờ cài đặt (Flags)...","system")
    if (opendiscord.defaults.getDefault("flagLoading")){
        await (await import("./data/framework/flagLoader.js")).loadAllFlags()
    }
    await opendiscord.events.get("onFlagLoad").emit([opendiscord.flags])
    await opendiscord.events.get("afterFlagsLoaded").emit([opendiscord.flags])

    // Khởi tạo Flags
    await opendiscord.events.get("onFlagInit").emit([opendiscord.flags])
    if (opendiscord.defaults.getDefault("flagInitiating")){
        await opendiscord.flags.init()
        opendiscord.debugfile.writeText("\n[ENABLED FLAGS]:\n"+opendiscord.flags.getFiltered((flag) => (flag.value == true)).map((flag) => flag.id.value).join("\n")+"\n")
        await opendiscord.events.get("afterFlagsInitiated").emit([opendiscord.flags])
    }

    // Tải chế độ Debug (Gỡ lỗi)
    if (opendiscord.defaults.getDefault("debugLoading")){
        const debugFlag = opendiscord.flags.get("opendiscord:debug")
        opendiscord.debug.visible = (debugFlag) ? debugFlag.value : false
    }

    // Tải chế độ Im lặng (Silent Mode)
    if (opendiscord.defaults.getDefault("silentLoading")){
        const silentFlag = opendiscord.flags.get("opendiscord:silent")
        opendiscord.console.silent = (silentFlag) ? silentFlag.value : false
        if (opendiscord.console.silent){
            opendiscord.console.silent = false
            opendiscord.log("Chế độ Im lặng đang bật! Log sẽ không hiện trên console.","warning")
            opendiscord.console.silent = true
        }
    }

    // 7. Tải thanh tiến trình (Progress Bars)
    opendiscord.log("[PumpkinMC] Đang tải thanh tiến trình...","system")
    if (opendiscord.defaults.getDefault("progressBarRendererLoading")){
        await (await import("./data/framework/progressBarLoader.js")).loadAllProgressBarRenderers()
    }
    await opendiscord.events.get("onProgressBarRendererLoad").emit([opendiscord.progressbars.renderers])
    await opendiscord.events.get("afterProgressBarRenderersLoaded").emit([opendiscord.progressbars.renderers])
    
    if (opendiscord.defaults.getDefault("progressBarLoading")){
        await (await import("./data/framework/progressBarLoader.js")).loadAllProgressBars()
    }
    await opendiscord.events.get("onProgressBarLoad").emit([opendiscord.progressbars])
    await opendiscord.events.get("afterProgressBarsLoaded").emit([opendiscord.progressbars])

    // 8. Tải cấu hình (Config)
    opendiscord.log("[PumpkinMC] Đang tải cấu hình (configs)...","system")
    if (opendiscord.defaults.getDefault("configLoading")){
        await (await import("./data/framework/configLoader.js")).loadAllConfigs()
    }
    await opendiscord.events.get("onConfigLoad").emit([opendiscord.configs])
    await opendiscord.events.get("afterConfigsLoaded").emit([opendiscord.configs])

    // Khởi tạo Config
    await opendiscord.events.get("onConfigInit").emit([opendiscord.configs])
    if (opendiscord.defaults.getDefault("configInitiating")){
        await opendiscord.configs.init()
        await opendiscord.events.get("afterConfigsInitiated").emit([opendiscord.configs])
    }

    // CẤU HÌNH TIỆN ÍCH
    const generalConfig = opendiscord.configs.get("opendiscord:general")

    if (opendiscord.defaults.getDefault("emojiTitleStyleLoading")){
        // Thiết lập kiểu Emoji dựa trên config
        opendiscord.defaults.setDefault("emojiTitleStyle",generalConfig.data.system.emojiStyle)
    }
    
    // 9. Tải cơ sở dữ liệu (Database)
    opendiscord.log("[PumpkinMC] Đang tải cơ sở dữ liệu...","system")
    if (opendiscord.defaults.getDefault("databaseLoading")){
        await (await import("./data/framework/databaseLoader.js")).loadAllDatabases()
    }
    await opendiscord.events.get("onDatabaseLoad").emit([opendiscord.databases])
    await opendiscord.events.get("afterDatabasesLoaded").emit([opendiscord.databases])

    // Khởi tạo Database
    await opendiscord.events.get("onDatabaseInit").emit([opendiscord.databases])
    if (opendiscord.defaults.getDefault("databaseInitiating")){
        await opendiscord.databases.init()
        await opendiscord.events.get("afterDatabasesInitiated").emit([opendiscord.databases])
    }

    // 10. Tải phiên làm việc (Sessions)
    opendiscord.log("[PumpkinMC] Đang tải phiên làm việc (sessions)...","system")
    if (opendiscord.defaults.getDefault("sessionLoading")){

    }
    await opendiscord.events.get("onSessionLoad").emit([opendiscord.sessions])
    await opendiscord.events.get("afterSessionsLoaded").emit([opendiscord.sessions])    

    // 11. Tải ngôn ngữ (Language)
    opendiscord.log("[PumpkinMC] Đang tải ngôn ngữ...","system")
    if (opendiscord.defaults.getDefault("languageLoading")){
        await (await import("./data/framework/languageLoader.js")).loadAllLanguages()
    }
    await opendiscord.events.get("onLanguageLoad").emit([opendiscord.languages])
    await opendiscord.events.get("afterLanguagesLoaded").emit([opendiscord.languages])   
    
    // Khởi tạo ngôn ngữ
    await opendiscord.events.get("onLanguageInit").emit([opendiscord.languages])
    if (opendiscord.defaults.getDefault("languageInitiating")){
        await opendiscord.languages.init()
        await opendiscord.events.get("afterLanguagesInitiated").emit([opendiscord.languages])

        // Thêm ngôn ngữ vào danh sách để checker kiểm tra
        const languageList = opendiscord.defaults.getDefault("languageList")
        const languageIds = opendiscord.languages.getIds().map((id) => {
            if (id.value.startsWith("opendiscord:")){
                return id.value.split("opendiscord:")[1]
            }else return id.value
        })
        languageList.push(...languageIds)
        opendiscord.defaults.setDefault("languageList",languageList)
    }

    // CHỌN NGÔN NGỮ
    await opendiscord.events.get("onLanguageSelect").emit([opendiscord.languages])
    if (opendiscord.defaults.getDefault("languageSelection")){
        // Thiết lập ngôn ngữ hiện tại
        const languageId = (generalConfig?.data?.language) ? generalConfig.data.language  : "english"
        if (languageId.includes(":")){
            opendiscord.languages.setCurrentLanguage(languageId)
        }else{
            opendiscord.languages.setCurrentLanguage("opendiscord:"+languageId)
        }

        // Thiết lập ngôn ngữ dự phòng
        const backupLanguageId = opendiscord.defaults.getDefault("backupLanguage")
        if (opendiscord.languages.exists(backupLanguageId)){
            opendiscord.languages.setBackupLanguage(backupLanguageId)
            
        }else throw new api.ODSystemError("Không tìm thấy ngôn ngữ dự phòng '"+backupLanguageId+"'!")

        await opendiscord.events.get("afterLanguagesSelected").emit([opendiscord.languages.get(languageId),opendiscord.languages.get(backupLanguageId),opendiscord.languages])    
    }

    // Xử lý di chuyển dữ liệu (Phần 2)
    if (lastVersion) await (await import("./core/startup/manageMigration.js")).loadAllAfterInitVersionMigrations(lastVersion)
    
    // 12. Trình kiểm tra cấu hình (Config Checker)
    opendiscord.log("[PumpkinMC] Đang tải trình kiểm tra cấu hình...","system")
    if (opendiscord.defaults.getDefault("checkerLoading")){
        await (await import("./data/framework/checkerLoader.js")).loadAllConfigCheckers()
    }
    await opendiscord.events.get("onCheckerLoad").emit([opendiscord.checkers])
    await opendiscord.events.get("afterCheckersLoaded").emit([opendiscord.checkers])

    // Tải hàm kiểm tra
    if (opendiscord.defaults.getDefault("checkerFunctionLoading")){
        await (await import("./data/framework/checkerLoader.js")).loadAllConfigCheckerFunctions()
    }
    await opendiscord.events.get("onCheckerFunctionLoad").emit([opendiscord.checkers.functions,opendiscord.checkers])
    await opendiscord.events.get("afterCheckerFunctionsLoaded").emit([opendiscord.checkers.functions,opendiscord.checkers])
    
    // Chạy kiểm tra cấu hình
    await opendiscord.events.get("onCheckerExecute").emit([opendiscord.checkers])
    if (opendiscord.defaults.getDefault("checkerExecution")){
        const result = opendiscord.checkers.checkAll(true)
        await opendiscord.events.get("afterCheckersExecuted").emit([result,opendiscord.checkers])
    }

    // Tải bản dịch cho trình kiểm tra
    if (opendiscord.defaults.getDefault("checkerTranslationLoading")){
        await (await import("./data/framework/checkerLoader.js")).loadAllConfigCheckerTranslations()
    }
    await opendiscord.events.get("onCheckerTranslationLoad").emit([opendiscord.checkers.translation,((generalConfig && generalConfig.data.system && generalConfig.data.system.useTranslatedConfigChecker) ? generalConfig.data.system.useTranslatedConfigChecker : false),opendiscord.checkers])
    await opendiscord.events.get("afterCheckerTranslationsLoaded").emit([opendiscord.checkers.translation,opendiscord.checkers])

    // Hiển thị kết quả kiểm tra
    const advancedCheckerFlag = opendiscord.flags.get("opendiscord:checker")
    const disableCheckerFlag = opendiscord.flags.get("opendiscord:no-checker")
    const useCliFlag = opendiscord.flags.get("opendiscord:cli")

    await opendiscord.events.get("onCheckerRender").emit([opendiscord.checkers.renderer,opendiscord.checkers])
    if (opendiscord.defaults.getDefault("checkerRendering") && !(disableCheckerFlag ? disableCheckerFlag.value : false) && !(useCliFlag ? useCliFlag.value : false)){
        const result = opendiscord.checkers.lastResult
        if (!result) return opendiscord.log("Lỗi hiển thị Config Checker! (Không lấy được kết quả)","error")
        
        const components = opendiscord.checkers.renderer.getComponents(!(advancedCheckerFlag ? advancedCheckerFlag.value : false),opendiscord.defaults.getDefault("checkerRenderEmpty"),opendiscord.checkers.translation,result)

        // Ghi log kết quả
        opendiscord.debugfile.writeText("\n[CONFIG CHECKER RESULT]:\n"+ansis.strip(components.join("\n"))+"\n")
        opendiscord.checkers.renderer.render(components)

        // Đợi 5 giây nếu có cảnh báo (warning)
        if (result.messages.length > 0 && result.messages.some((msg) => msg.type == "warning") && result.messages.every((msg) => msg.type != "error")) await utilities.timer(5000)

        await opendiscord.events.get("afterCheckersRendered").emit([opendiscord.checkers.renderer,opendiscord.checkers])
    }

    // Thoát nếu cấu hình lỗi nặng
    if (opendiscord.checkers.lastResult && !opendiscord.checkers.lastResult.valid && !(disableCheckerFlag ? disableCheckerFlag.value : false) && !(useCliFlag ? useCliFlag.value : false)){
        await opendiscord.events.get("onCheckerQuit").emit([opendiscord.checkers])
        if (opendiscord.defaults.getDefault("checkerQuit")){
            process.exit(1)
        }
    }

    // Chế độ CLI (Command Line Interface)
    if (useCliFlag && useCliFlag.value){
        await (await (import("./core/cli/cli.js"))).execute()
        await utilities.timer(1000)
        console.log("\n\n"+ansis.red("❌ Có lỗi xảy ra trong Interactive Setup CLI. Vui lòng thử lại."))
        process.exit(0)
    }

    // Load plugin trước khi load client
    await opendiscord.events.get("onPluginBeforeClientLoad").emit([])
    await opendiscord.events.get("afterPluginBeforeClientLoaded").emit([])

    // 13. Cấu hình Client (Discord.js)
    opendiscord.log("[PumpkinMC] Đang tải client Discord...","system")
    if (opendiscord.defaults.getDefault("clientLoading")){
        // Thêm Intents (Quyền cơ bản)
        opendiscord.client.intents.push(
            "Guilds",
            "GuildMessages",
            "DirectMessages",
            "GuildEmojisAndStickers",
            "GuildMembers",
            "MessageContent",
            "GuildWebhooks",
            "GuildInvites"
        )

        // Thêm Privileged Intents (Quyền cao cấp - Yêu cầu bật trên Dev Portal)
        opendiscord.client.privileges.push("MessageContent","GuildMembers")

        // Thêm Partials (Hỗ trợ DM)
        opendiscord.client.partials.push("Channel","Message")

        // Thêm Permissions
        opendiscord.client.permissions.push(
            "AddReactions",
            "AttachFiles",
            "CreatePrivateThreads",
            "CreatePublicThreads",
            "EmbedLinks",
            "ManageChannels",
            "ManageGuild",
            "ManageMessages",
            "ChangeNickname",
            "ManageRoles",
            "ManageThreads",
            "ManageWebhooks",
            "MentionEveryone",
            "ReadMessageHistory",
            "SendMessages",
            "SendMessagesInThreads",
            "UseApplicationCommands",
            "UseExternalEmojis",
            "ViewAuditLog",
            "ViewChannel"
        )

        // Lấy Token từ config hoặc biến môi trường
        const configToken = opendiscord.configs.get("opendiscord:general").data.token ? opendiscord.configs.get("opendiscord:general").data.token : ""
        const envToken = opendiscord.env.getVariable("TOKEN") ? opendiscord.env.getVariable("TOKEN") : ""
        const token = opendiscord.configs.get("opendiscord:general").data.tokenFromENV ? envToken : configToken
        opendiscord.client.token = token
    }
    await opendiscord.events.get("onClientLoad").emit([opendiscord.client])
    await opendiscord.events.get("afterClientLoaded").emit([opendiscord.client])

    // Xử lý khi Client sẵn sàng (Ready)
    opendiscord.client.readyListener = async () => {
        opendiscord.log("[PumpkinMC] Đang thiết lập client...","system")
        await opendiscord.events.get("onClientReady").emit([opendiscord.client])
        if (opendiscord.defaults.getDefault("clientReady")){
            const client = opendiscord.client

            // Kiểm tra server chính
            const botServers = await client.getGuilds()
            const generalConfig = opendiscord.configs.get("opendiscord:general")
            const serverId = generalConfig.data.serverId ? generalConfig.data.serverId : ""
            if (!serverId) throw new api.ODSystemError("Thiếu Server ID trong config!")
            
            const mainServer = botServers.find((g) => g.id == serverId)
            client.mainServer = mainServer ?? null
            
            // Lỗi: Bot chưa vào server chính
            if (!mainServer || !client.checkBotInGuild(mainServer)){
                console.log("\n")
                opendiscord.log("[PumpkinMC] Lỗi: Bot chưa tham gia máy chủ được chỉ định trong config!","error")
                opendiscord.log("Vui lòng mời bot vào server PumpkinMC!","info")
                console.log("\n")
                process.exit(1)
            }
            // Lỗi: Bot thiếu quyền
            if (!client.checkGuildPerms(mainServer)){
                console.log("\n")
                opendiscord.log("[PumpkinMC] Lỗi: Bot không đủ quyền hạn trong server!","error")
                opendiscord.log("Vui lòng cấp quyền \"Administrator\" cho bot!","info")
                console.log("\n")
                process.exit(1)
            }
            if (opendiscord.defaults.getDefault("clientMultiGuildWarning")){
                // Cảnh báo nếu bot ở nhiều server
                if (botServers.length > 1){
                    opendiscord.log("Cảnh báo: Bot đang ở trong nhiều server. PumpkinMC System chỉ hỗ trợ 1 server duy nhất!","warning")
                    opendiscord.log("Bot có thể hoạt động không ổn định ở các server phụ.","info")
                }
                botServers.forEach((server) => {
                    if (!client.checkGuildPerms(server)) opendiscord.log(`Bot thiếu quyền trong server "${server.name}"!`,"warning")
                })
            }

            // Tải trạng thái bot (Activity)
            opendiscord.log("[PumpkinMC] Đang tải trạng thái bot (Activity)...","system")
            if (opendiscord.defaults.getDefault("clientActivityLoading")){
                if (generalConfig.data.status && generalConfig.data.status.enabled) opendiscord.client.activity.setStatus(generalConfig.data.status.type,generalConfig.data.status.text,generalConfig.data.status.mode,generalConfig.data.status.state)
            }
            await opendiscord.events.get("onClientActivityLoad").emit([opendiscord.client.activity,opendiscord.client])
            await opendiscord.events.get("afterClientActivityLoaded").emit([opendiscord.client.activity,opendiscord.client])

            // Khởi tạo Activity
            await opendiscord.events.get("onClientActivityInit").emit([opendiscord.client.activity,opendiscord.client])
            if (opendiscord.defaults.getDefault("clientActivityInitiating")){
                opendiscord.client.activity.initStatus()
                await opendiscord.events.get("afterClientActivityInitiated").emit([opendiscord.client.activity,opendiscord.client])
            }

            // Tải mức độ ưu tiên (Priority Levels)
            opendiscord.log("[PumpkinMC] Đang tải mức độ ưu tiên...","system")
            if (opendiscord.defaults.getDefault("priorityLoading")){
                await (await import("./data/openticket/priorityLoader.js")).loadAllPriorityLevels()
            }
            await opendiscord.events.get("onPriorityLoad").emit([opendiscord.priorities])
            await opendiscord.events.get("afterPrioritiesLoaded").emit([opendiscord.priorities])

            // Tải Slash Commands
            opendiscord.log("[PumpkinMC] Đang tải Slash Commands...","system")
            if (opendiscord.defaults.getDefault("slashCommandLoading")){
                await (await import("./data/framework/commandLoader.js")).loadAllSlashCommands()
            }
            await opendiscord.events.get("onSlashCommandLoad").emit([opendiscord.client.slashCommands,opendiscord.client])
            await opendiscord.events.get("afterSlashCommandsLoaded").emit([opendiscord.client.slashCommands,opendiscord.client])
            
            // Đăng ký Slash Commands (Tạo/Cập nhật/Xóa)
            if (opendiscord.defaults.getDefault("forceSlashCommandRegistration")) opendiscord.log("Đang bắt buộc đăng ký lại toàn bộ lệnh...","system")
            opendiscord.log("Đang đăng ký Slash Commands... (Có thể mất tới 2 phút)","system")
            await opendiscord.events.get("onSlashCommandRegister").emit([opendiscord.client.slashCommands,opendiscord.client])
            if (opendiscord.defaults.getDefault("slashCommandRegistering")){
                const cmds = await opendiscord.client.slashCommands.getAllRegisteredCommands()
                const removableCmds = cmds.unused.map((cmd) => cmd.cmd)
                const newCmds = cmds.unregistered.map((cmd) => cmd.instance)
                const updatableCmds = cmds.registered.filter((cmd) => cmd.requiresUpdate || opendiscord.defaults.getDefault("forceSlashCommandRegistration")).map((cmd) => cmd.instance)

                const removeProgress = opendiscord.progressbars.get("opendiscord:slash-command-remove")
                const createProgress = opendiscord.progressbars.get("opendiscord:slash-command-create")
                const updateProgress = opendiscord.progressbars.get("opendiscord:slash-command-update")

                if (opendiscord.defaults.getDefault("allowSlashCommandRemoval")) await opendiscord.client.slashCommands.removeUnusedCommands(removableCmds,undefined,removeProgress)
                await opendiscord.client.slashCommands.createNewCommands(newCmds,createProgress)
                await opendiscord.client.slashCommands.updateExistingCommands(updatableCmds,updateProgress)
                
                await opendiscord.events.get("afterSlashCommandsRegistered").emit([opendiscord.client.slashCommands,opendiscord.client])
            }

            // Tải Context Menus
            opendiscord.log("[PumpkinMC] Đang tải Context Menus...","system")
            if (opendiscord.defaults.getDefault("contextMenuLoading")){
                await (await import("./data/framework/commandLoader.js")).loadAllContextMenus()
            }
            await opendiscord.events.get("onContextMenuLoad").emit([opendiscord.client.contextMenus,opendiscord.client])
            await opendiscord.events.get("afterContextMenusLoaded").emit([opendiscord.client.contextMenus,opendiscord.client])
            
            // Đăng ký Context Menus
            if (opendiscord.defaults.getDefault("forceContextMenuRegistration")) opendiscord.log("Đang bắt buộc đăng ký lại Context Menus...","system")
            opendiscord.log("Đang đăng ký Context Menus...","system")
            await opendiscord.events.get("onContextMenuRegister").emit([opendiscord.client.contextMenus,opendiscord.client])
            if (opendiscord.defaults.getDefault("contextMenuRegistering")){
                const menus = await opendiscord.client.contextMenus.getAllRegisteredMenus()
                const removableMenus = menus.unused.map((menu) => menu.menu)
                const newMenus = menus.unregistered.map((menu) => menu.instance)
                const updatableMenus = menus.registered.filter((menu) => menu.requiresUpdate || opendiscord.defaults.getDefault("forceContextMenuRegistration")).map((menu) => menu.instance)

                const removeProgress = opendiscord.progressbars.get("opendiscord:context-menu-remove")
                const createProgress = opendiscord.progressbars.get("opendiscord:context-menu-create")
                const updateProgress = opendiscord.progressbars.get("opendiscord:context-menu-update")

                if (opendiscord.defaults.getDefault("allowContextMenuRemoval")) await opendiscord.client.contextMenus.removeUnusedMenus(removableMenus,undefined,removeProgress)
                await opendiscord.client.contextMenus.createNewMenus(newMenus,createProgress)
                await opendiscord.client.contextMenus.updateExistingMenus(updatableMenus,updateProgress)
                
                await opendiscord.events.get("afterContextMenusRegistered").emit([opendiscord.client.contextMenus,opendiscord.client])
            }

            // Tải Text Commands (Lệnh chat truyền thống)
            opendiscord.log("[PumpkinMC] Đang tải Text Commands...","system")
            if (opendiscord.defaults.getDefault("allowDumpCommand")){
                (await import("./core/startup/dump.js")).loadDumpCommand()
            }
            if (opendiscord.defaults.getDefault("textCommandLoading")){
                await (await import("./data/framework/commandLoader.js")).loadAllTextCommands()
            }
            await opendiscord.events.get("onTextCommandLoad").emit([opendiscord.client.textCommands,opendiscord.client])
            await opendiscord.events.get("afterTextCommandsLoaded").emit([opendiscord.client.textCommands,opendiscord.client])

            await opendiscord.events.get("afterClientReady").emit([opendiscord.client])
        }
    }

    // 14. Đăng nhập Client
    opendiscord.log("[PumpkinMC] Đang đăng nhập...","system")
    await opendiscord.events.get("onClientInit").emit([opendiscord.client])
    if (opendiscord.defaults.getDefault("clientInitiating")){
        opendiscord.client.initClient()
        await opendiscord.events.get("afterClientInitiated").emit([opendiscord.client])

        await opendiscord.client.login().catch((reason) => process.emit("uncaughtException",new api.ODSystemError(reason)))
        opendiscord.log("[PumpkinMC] Client Discord đã sẵn sàng!","info")
    }

    // Load plugin trước manager
    await opendiscord.events.get("onPluginBeforeManagerLoad").emit([])
    await opendiscord.events.get("afterPluginBeforeManagerLoaded").emit([])

    // 15. Tải các thành phần quản lý (Managers)
    opendiscord.log("[PumpkinMC] Đang tải câu hỏi (questions)...","system")
    if (opendiscord.defaults.getDefault("questionLoading")){
        await (await import("./data/openticket/questionLoader.js")).loadAllQuestions()
    }
    await opendiscord.events.get("onQuestionLoad").emit([opendiscord.questions])
    await opendiscord.events.get("afterQuestionsLoaded").emit([opendiscord.questions])
    
    opendiscord.log("[PumpkinMC] Đang tải tùy chọn (options)...","system")
    if (opendiscord.defaults.getDefault("optionLoading")){
        await (await import("./data/openticket/optionLoader.js")).loadAllOptions()
    }
    await opendiscord.events.get("onOptionLoad").emit([opendiscord.options])
    await opendiscord.events.get("afterOptionsLoaded").emit([opendiscord.options])
    
    opendiscord.log("[PumpkinMC] Đang tải bảng điều khiển (panels)...","system")
    if (opendiscord.defaults.getDefault("panelLoading")){
        await (await import("./data/openticket/panelLoader.js")).loadAllPanels()
    }
    await opendiscord.events.get("onPanelLoad").emit([opendiscord.panels])
    await opendiscord.events.get("afterPanelsLoaded").emit([opendiscord.panels])

    opendiscord.log("[PumpkinMC] Đang tải dữ liệu vé (tickets)...","system")
    if (opendiscord.defaults.getDefault("ticketLoading")){
        opendiscord.tickets.useGuild(opendiscord.client.mainServer)
        await (await import("./data/openticket/ticketLoader.js")).loadAllTickets()
    }
    await opendiscord.events.get("onTicketLoad").emit([opendiscord.tickets])
    await opendiscord.events.get("afterTicketsLoaded").emit([opendiscord.tickets])
    
    opendiscord.log("[PumpkinMC] Đang tải roles...","system")
    if (opendiscord.defaults.getDefault("roleLoading")){
        await (await import("./data/openticket/roleLoader.js")).loadAllRoles()
    }
    await opendiscord.events.get("onRoleLoad").emit([opendiscord.roles])
    await opendiscord.events.get("afterRolesLoaded").emit([opendiscord.roles])

    opendiscord.log("[PumpkinMC] Đang tải danh sách đen (blacklist)...","system")
    if (opendiscord.defaults.getDefault("blacklistLoading")){
        await (await import("./data/openticket/blacklistLoader.js")).loadAllBlacklistedUsers()
    }
    await opendiscord.events.get("onBlacklistLoad").emit([opendiscord.blacklist])
    await opendiscord.events.get("afterBlacklistLoaded").emit([opendiscord.blacklist])

    opendiscord.log("[PumpkinMC] Đang tải bộ xử lý transcript...","system")
    if (opendiscord.defaults.getDefault("transcriptCompilerLoading")){
        await (await import("./data/openticket/transcriptLoader.js")).loadAllTranscriptCompilers()
    }
    await opendiscord.events.get("onTranscriptCompilerLoad").emit([opendiscord.transcripts])
    await opendiscord.events.get("afterTranscriptCompilersLoaded").emit([opendiscord.transcripts])

    if (opendiscord.defaults.getDefault("transcriptHistoryLoading")){
        await (await import("./data/openticket/transcriptLoader.js")).loadTranscriptHistory()
    }
    await opendiscord.events.get("onTranscriptHistoryLoad").emit([opendiscord.transcripts])
    await opendiscord.events.get("afterTranscriptHistoryLoaded").emit([opendiscord.transcripts])

    // Load plugin trước builders
    await opendiscord.events.get("onPluginBeforeBuilderLoad").emit([])
    await opendiscord.events.get("afterPluginBeforeBuilderLoaded").emit([])

    // 16. Tải Builders (Nút, Menu, File, Embed, Tin nhắn, Form)
    opendiscord.log("[PumpkinMC] Đang tải Button Builders...","system")
    if (opendiscord.defaults.getDefault("buttonBuildersLoading")){
        await (await import("./builders/buttons.js")).registerAllButtons()
    }
    await opendiscord.events.get("onButtonBuilderLoad").emit([opendiscord.builders.buttons,opendiscord.builders,opendiscord.actions])
    await opendiscord.events.get("afterButtonBuildersLoaded").emit([opendiscord.builders.buttons,opendiscord.builders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải Dropdown Builders...","system")
    if (opendiscord.defaults.getDefault("dropdownBuildersLoading")){
        await (await import("./builders/dropdowns.js")).registerAllDropdowns()
    }
    await opendiscord.events.get("onDropdownBuilderLoad").emit([opendiscord.builders.dropdowns,opendiscord.builders,opendiscord.actions])
    await opendiscord.events.get("afterDropdownBuildersLoaded").emit([opendiscord.builders.dropdowns,opendiscord.builders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải File Builders...","system")
    if (opendiscord.defaults.getDefault("fileBuildersLoading")){
        await (await import("./builders/files.js")).registerAllFiles()
    }
    await opendiscord.events.get("onFileBuilderLoad").emit([opendiscord.builders.files,opendiscord.builders,opendiscord.actions])
    await opendiscord.events.get("afterFileBuildersLoaded").emit([opendiscord.builders.files,opendiscord.builders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải Embed Builders...","system")
    if (opendiscord.defaults.getDefault("embedBuildersLoading")){
        await (await import("./builders/embeds.js")).registerAllEmbeds()
    }
    await opendiscord.events.get("onEmbedBuilderLoad").emit([opendiscord.builders.embeds,opendiscord.builders,opendiscord.actions])
    await opendiscord.events.get("afterEmbedBuildersLoaded").emit([opendiscord.builders.embeds,opendiscord.builders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải Message Builders...","system")
    if (opendiscord.defaults.getDefault("messageBuildersLoading")){
        await (await import("./builders/messages.js")).registerAllMessages()
    }
    await opendiscord.events.get("onMessageBuilderLoad").emit([opendiscord.builders.messages,opendiscord.builders,opendiscord.actions])
    await opendiscord.events.get("afterMessageBuildersLoaded").emit([opendiscord.builders.messages,opendiscord.builders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải Modal Builders...","system")
    if (opendiscord.defaults.getDefault("modalBuildersLoading")){
        await (await import("./builders/modals.js")).registerAllModals()
    }
    await opendiscord.events.get("onModalBuilderLoad").emit([opendiscord.builders.modals,opendiscord.builders,opendiscord.actions])
    await opendiscord.events.get("afterModalBuildersLoaded").emit([opendiscord.builders.modals,opendiscord.builders,opendiscord.actions])

    // Load plugin trước responders
    await opendiscord.events.get("onPluginBeforeResponderLoad").emit([])
    await opendiscord.events.get("afterPluginBeforeResponderLoaded").emit([])

    // 17. Tải bộ phản hồi (Responders)
    opendiscord.log("[PumpkinMC] Đang tải bộ phản hồi lệnh (Command Responders)...","system")
    if (opendiscord.defaults.getDefault("commandRespondersLoading")){
        await (await import("./commands/help.js")).registerCommandResponders()
        await (await import("./commands/stats.js")).registerCommandResponders()
        await (await import("./commands/panel.js")).registerCommandResponders()
        await (await import("./commands/ticket.js")).registerCommandResponders()
        await (await import("./commands/blacklist.js")).registerCommandResponders()
        await (await import("./commands/close.js")).registerCommandResponders()
        await (await import("./commands/reopen.js")).registerCommandResponders()
        await (await import("./commands/delete.js")).registerCommandResponders()
        await (await import("./commands/claim.js")).registerCommandResponders()
        await (await import("./commands/unclaim.js")).registerCommandResponders()
        await (await import("./commands/pin.js")).registerCommandResponders()
        await (await import("./commands/unpin.js")).registerCommandResponders()
        await (await import("./commands/rename.js")).registerCommandResponders()
        await (await import("./commands/move.js")).registerCommandResponders()
        await (await import("./commands/add.js")).registerCommandResponders()
        await (await import("./commands/remove.js")).registerCommandResponders()
        await (await import("./commands/clear.js")).registerCommandResponders()
        await (await import("./commands/autoclose.js")).registerCommandResponders()
        await (await import("./commands/autodelete.js")).registerCommandResponders()
        await (await import("./commands/topic.js")).registerCommandResponders()
        await (await import("./commands/priority.js")).registerCommandResponders()
        await (await import("./commands/transfer.js")).registerCommandResponders()
    }
    await opendiscord.events.get("onCommandResponderLoad").emit([opendiscord.responders.commands,opendiscord.responders,opendiscord.actions])
    await opendiscord.events.get("afterCommandRespondersLoaded").emit([opendiscord.responders.commands,opendiscord.responders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải bộ phản hồi nút bấm (Button Responders)...","system")
    if (opendiscord.defaults.getDefault("buttonRespondersLoading")){
        await (await import("./actions/handleVerifyBar.js")).registerButtonResponders()
        await (await import("./actions/handleTranscriptErrors.js")).registerButtonResponders()
        await (await import("./commands/help.js")).registerButtonResponders()
        await (await import("./commands/ticket.js")).registerButtonResponders()
        await (await import("./commands/close.js")).registerButtonResponders()
        await (await import("./commands/reopen.js")).registerButtonResponders()
        await (await import("./commands/delete.js")).registerButtonResponders()
        await (await import("./commands/claim.js")).registerButtonResponders()
        await (await import("./commands/unclaim.js")).registerButtonResponders()
        await (await import("./commands/pin.js")).registerButtonResponders()
        await (await import("./commands/unpin.js")).registerButtonResponders()
        await (await import("./commands/role.js")).registerButtonResponders()
        await (await import("./commands/clear.js")).registerButtonResponders()
    }
    await opendiscord.events.get("onButtonResponderLoad").emit([opendiscord.responders.buttons,opendiscord.responders,opendiscord.actions])
    await opendiscord.events.get("afterButtonRespondersLoaded").emit([opendiscord.responders.buttons,opendiscord.responders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải bộ phản hồi Dropdown...","system")
    if (opendiscord.defaults.getDefault("dropdownRespondersLoading")){
        await (await import("./commands/ticket.js")).registerDropdownResponders()
    }
    await opendiscord.events.get("onDropdownResponderLoad").emit([opendiscord.responders.dropdowns,opendiscord.responders,opendiscord.actions])
    await opendiscord.events.get("afterDropdownRespondersLoaded").emit([opendiscord.responders.dropdowns,opendiscord.responders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải bộ phản hồi Modal...","system")
    if (opendiscord.defaults.getDefault("modalRespondersLoading")){
        await (await import("./commands/ticket.js")).registerModalResponders()
        await (await import("./commands/close.js")).registerModalResponders()
        await (await import("./commands/reopen.js")).registerModalResponders()
        await (await import("./commands/delete.js")).registerModalResponders()
        await (await import("./commands/claim.js")).registerModalResponders()
        await (await import("./commands/unclaim.js")).registerModalResponders()
        await (await import("./commands/pin.js")).registerModalResponders()
        await (await import("./commands/unpin.js")).registerModalResponders()
    }
    await opendiscord.events.get("onModalResponderLoad").emit([opendiscord.responders.modals,opendiscord.responders,opendiscord.actions])
    await opendiscord.events.get("afterModalRespondersLoaded").emit([opendiscord.responders.modals,opendiscord.responders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải bộ phản hồi Context Menu...","system")
    if (opendiscord.defaults.getDefault("contextMenuRespondersLoading")){
        //TODO!!
    }
    await opendiscord.events.get("onContextMenuResponderLoad").emit([opendiscord.responders.contextMenus,opendiscord.responders,opendiscord.actions])
    await opendiscord.events.get("afterContextMenuRespondersLoaded").emit([opendiscord.responders.contextMenus,opendiscord.responders,opendiscord.actions])

    opendiscord.log("[PumpkinMC] Đang tải bộ phản hồi Autocomplete...","system")
    if (opendiscord.defaults.getDefault("autocompleteRespondersLoading")){
        await (await import("./commands/autocomplete.js")).registerAutocompleteResponders()
    }
    await opendiscord.events.get("onAutocompleteResponderLoad").emit([opendiscord.responders.autocomplete,opendiscord.responders,opendiscord.actions])
    await opendiscord.events.get("afterAutocompleteRespondersLoaded").emit([opendiscord.responders.autocomplete,opendiscord.responders,opendiscord.actions])

    // Load plugin trước finalizations
    await opendiscord.events.get("onPluginBeforeFinalizationLoad").emit([])
    await opendiscord.events.get("afterPluginBeforeFinalizationLoaded").emit([])

    // 18. Tải các hành động (Actions)
    opendiscord.log("[PumpkinMC] Đang tải các hành động (Actions)...","system")
    if (opendiscord.defaults.getDefault("actionsLoading")){
        await (await import("./actions/createTicketPermissions.js")).registerActions()
        await (await import("./actions/createTranscript.js")).registerActions()
        await (await import("./actions/createTicket.js")).registerActions()
        await (await import("./actions/closeTicket.js")).registerActions()
        await (await import("./actions/deleteTicket.js")).registerActions()
        await (await import("./actions/reopenTicket.js")).registerActions()
        await (await import("./actions/claimTicket.js")).registerActions()
        await (await import("./actions/unclaimTicket.js")).registerActions()
        await (await import("./actions/pinTicket.js")).registerActions()
        await (await import("./actions/unpinTicket.js")).registerActions()
        await (await import("./actions/renameTicket.js")).registerActions()
        await (await import("./actions/moveTicket.js")).registerActions()
        await (await import("./actions/addTicketUser.js")).registerActions()
        await (await import("./actions/removeTicketUser.js")).registerActions()
        await (await import("./actions/reactionRole.js")).registerActions()
        await (await import("./actions/clearTickets.js")).registerActions()
        await (await import("./actions/updateTicketTopic.js")).registerActions()
        await (await import("./actions/updateTicketPriority.js")).registerActions()
        await (await import("./actions/transferTicket.js")).registerActions()
    }
    await opendiscord.events.get("onActionLoad").emit([opendiscord.actions])
    await opendiscord.events.get("afterActionsLoaded").emit([opendiscord.actions])

    // 19. Tải Verifybars
    opendiscord.log("[PumpkinMC] Đang tải Verifybars...","system")
    if (opendiscord.defaults.getDefault("verifyBarsLoading")){
        await (await import("./actions/closeTicket.js")).registerVerifyBars()
        await (await import("./actions/deleteTicket.js")).registerVerifyBars()
        await (await import("./actions/reopenTicket.js")).registerVerifyBars()
        await (await import("./actions/claimTicket.js")).registerVerifyBars()
        await (await import("./actions/unclaimTicket.js")).registerVerifyBars()
        await (await import("./actions/pinTicket.js")).registerVerifyBars()
        await (await import("./actions/unpinTicket.js")).registerVerifyBars()
    }
    await opendiscord.events.get("onVerifyBarLoad").emit([opendiscord.verifybars])
    await opendiscord.events.get("afterVerifyBarsLoaded").emit([opendiscord.verifybars])

    // 20. Tải Permissions, Posts, Cooldowns...
    opendiscord.log("[PumpkinMC] Đang tải Permissions...","system")
    if (opendiscord.defaults.getDefault("permissionsLoading")){
        await (await import("./data/framework/permissionLoader.js")).loadAllPermissions()
    }
    await opendiscord.events.get("onPermissionLoad").emit([opendiscord.permissions])
    await opendiscord.events.get("afterPermissionsLoaded").emit([opendiscord.permissions])

    opendiscord.log("[PumpkinMC] Đang tải Posts...","system")
    if (opendiscord.defaults.getDefault("postsLoading")){
        await (await import("./data/framework/postLoader.js")).loadAllPosts()
    }
    await opendiscord.events.get("onPostLoad").emit([opendiscord.posts])
    await opendiscord.events.get("afterPostsLoaded").emit([opendiscord.posts])

    await opendiscord.events.get("onPostInit").emit([opendiscord.posts])
    if (opendiscord.defaults.getDefault("postsInitiating")){
        if (opendiscord.client.mainServer) opendiscord.posts.init(opendiscord.client.mainServer)
        await opendiscord.events.get("afterPostsInitiated").emit([opendiscord.posts])
    }

    opendiscord.log("[PumpkinMC] Đang tải Cooldowns...","system")
    if (opendiscord.defaults.getDefault("cooldownsLoading")){
        await (await import("./data/framework/cooldownLoader.js")).loadAllCooldowns()
    }
    await opendiscord.events.get("onCooldownLoad").emit([opendiscord.cooldowns])
    await opendiscord.events.get("afterCooldownsLoaded").emit([opendiscord.cooldowns])
    
    await opendiscord.events.get("onCooldownInit").emit([opendiscord.cooldowns])
    if (opendiscord.defaults.getDefault("cooldownsInitiating")){
        await opendiscord.cooldowns.init()
        await opendiscord.events.get("afterCooldownsInitiated").emit([opendiscord.cooldowns])
    }

    opendiscord.log("[PumpkinMC] Đang tải Help Menu...","system")
    if (opendiscord.defaults.getDefault("helpMenuCategoryLoading")){
        await (await import("./data/framework/helpMenuLoader.js")).loadAllHelpMenuCategories()
    }
    await opendiscord.events.get("onHelpMenuCategoryLoad").emit([opendiscord.helpmenu])
    await opendiscord.events.get("afterHelpMenuCategoriesLoaded").emit([opendiscord.helpmenu])

    if (opendiscord.defaults.getDefault("helpMenuComponentLoading")){
        await (await import("./data/framework/helpMenuLoader.js")).loadAllHelpMenuComponents()
    }
    await opendiscord.events.get("onHelpMenuComponentLoad").emit([opendiscord.helpmenu])
    await opendiscord.events.get("afterHelpMenuComponentsLoaded").emit([opendiscord.helpmenu])

    opendiscord.log("[PumpkinMC] Đang tải Stats...","system")
    if (opendiscord.defaults.getDefault("statScopesLoading")){
        opendiscord.stats.useDatabase(opendiscord.databases.get("opendiscord:stats"))
        await (await import("./data/framework/statLoader.js")).loadAllStatScopes()
    }
    await opendiscord.events.get("onStatScopeLoad").emit([opendiscord.stats])
    await opendiscord.events.get("afterStatScopesLoaded").emit([opendiscord.stats])

    if (opendiscord.defaults.getDefault("statLoading")){
        await (await import("./data/framework/statLoader.js")).loadAllStats()
    }
    await opendiscord.events.get("onStatLoad").emit([opendiscord.stats])
    await opendiscord.events.get("afterStatsLoaded").emit([opendiscord.stats])

    await opendiscord.events.get("onStatInit").emit([opendiscord.stats])
    if (opendiscord.defaults.getDefault("statInitiating")){
        await opendiscord.stats.init()
        await opendiscord.events.get("afterStatsInitiated").emit([opendiscord.stats])
    }

    // Load plugin trước code
    await opendiscord.events.get("onPluginBeforeCodeLoad").emit([])
    await opendiscord.events.get("afterPluginBeforeCodeLoaded").emit([])

    // 21. Tải và thực thi Code tùy chỉnh
    opendiscord.log("[PumpkinMC] Đang tải mã nguồn (code)...","system")
    if (opendiscord.defaults.getDefault("codeLoading")){
        await (await import("./data/framework/codeLoader.js")).loadAllCode()
    }
    await opendiscord.events.get("onCodeLoad").emit([opendiscord.code])
    await opendiscord.events.get("afterCodeLoaded").emit([opendiscord.code])

    await opendiscord.events.get("onCodeExecute").emit([opendiscord.code])
    if (opendiscord.defaults.getDefault("codeExecution")){
        await opendiscord.code.execute()
        await opendiscord.events.get("afterCodeExecuted").emit([opendiscord.code])
    }

    // 22. Hoàn tất Cài đặt
    opendiscord.log("[PumpkinMC] Cài đặt hoàn tất! Bot đã sẵn sàng!","info")

    // Tải Livestatus
    opendiscord.log("[PumpkinMC] Đang tải Livestatus...","system")
    if (opendiscord.defaults.getDefault("liveStatusLoading")){
        await (await import("./data/framework/liveStatusLoader.js")).loadAllLiveStatusSources()
    }
    await opendiscord.events.get("onLiveStatusSourceLoad").emit([opendiscord.livestatus])
    await opendiscord.events.get("afterLiveStatusSourcesLoaded").emit([opendiscord.livestatus])

    // Tải Màn hình khởi động (StartScreen)
    opendiscord.log("[PumpkinMC] Đang tải màn hình khởi động...","system")
    if (opendiscord.defaults.getDefault("startScreenLoading")){
        await (await import("./data/framework/startScreenLoader.js")).loadAllStartScreenComponents()
    }
    await opendiscord.events.get("onStartScreenLoad").emit([opendiscord.startscreen])
    await opendiscord.events.get("afterStartScreensLoaded").emit([opendiscord.startscreen])

    // Hiển thị Màn hình khởi động
    await opendiscord.events.get("onStartScreenRender").emit([opendiscord.startscreen])
    if (opendiscord.defaults.getDefault("startScreenRendering")){
        await opendiscord.startscreen.renderAllComponents()
        // Cảnh báo nếu dùng ngôn ngữ dịch máy (Optional)
        if (opendiscord.languages.getLanguageMetadata(false)?.automated){
            console.log("===================")
            opendiscord.log("[PumpkinMC] Cảnh báo: Ngôn ngữ đang dùng được dịch tự động!","warning")
            console.log("===================")
        }
        if (opendiscord.console.silent){
            opendiscord.console.silent = false
            opendiscord.log("Chế độ Im lặng đang bật! Log sẽ không hiện trên console.","warning")
            opendiscord.console.silent = true
        }

        await opendiscord.events.get("afterStartScreensRendered").emit([opendiscord.startscreen])
    }

    // HOÀN THÀNH - PUMPKINMC TICKET SYSTEM SẴN SÀNG
    await opendiscord.events.get("beforeReadyForUsage").emit([])
    opendiscord.readyStartupDate = new Date()
    await opendiscord.events.get("onReadyForUsage").emit([])
}
main()
