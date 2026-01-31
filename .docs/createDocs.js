//@ts-check
const fs = require("fs")

/*////// TRÌNH TẠO TÀI LIỆU PUMPKINMC NETWORK ////////
File này làm gì?
File này sẽ phân tích kết quả trả về từ TypeDoc (trình tạo tài liệu tự động).
Kết quả sau khi xử lý sẽ được sử dụng trong công cụ tạo tài liệu Markdown của PumpkinMC NetWork để tạo ra phần Tham chiếu API.

Nói ngắn gọn:
File này tạo ra tài liệu API cho hệ thống ticket của PumpkinMC NetWork

Cách đóng góp:
Nếu bạn muốn đóng góp vào tài liệu của PumpkinMC NetWork, hãy chạy lệnh sau:

> npm run docs

Lệnh này sẽ tạo ra file "result.json" mà bạn có dùng để cập nhật tài liệu chính thức.
Hướng dẫn chi tiết hơn có tại repository tài liệu của chúng tôi.
/////////////////////////////////*/

if (!fs.existsSync(".docs/typedoc-result.json")){
    console.log("Không thể tạo tài liệu! Vui lòng chạy TypeDoc trước bằng lệnh: npm run docs:typedoc")
    process.exit(1)
}

const result = JSON.parse(fs.readFileSync(".docs/typedoc-result.json").toString())
const availableElements = []
const skipElementNames = [
    "#opendiscord-types"
]

const handleFunction = (memberType) => {
    if (!memberType || !memberType.signatures || !Array.isArray(memberType.signatures)) return {type:"unknown"}
    
    // Cố gắng lấy chữ ký (signature) phù hợp nhất
    let signature = memberType.signatures.find((s) => !s.typeParameters)
    if (!signature) signature = memberType.signatures[0]
    if (!signature) return {type:"unknown"}

    // Cố gắng lấy comment từ signature hoặc từ bất kỳ signature nào có comment
    let comment = signature.comment
    if (!comment) comment = memberType.signatures.find((s) => s.comment)?.comment
    if (!comment) comment = null

    const signatureInherited = signature.flags.isInherited ? true : false
    const signatureComment = comment ? comment.summary?.map((c) => c.text).join("") : null
    const signatureParameters = signature.parameters?.map((p) => {
        return {name: p.name, details: handleType(p.type)}
    }) ?? []
    const signatureReturns = handleType(signature.type)

    return {
        type: "function",
        inherited: signatureInherited,
        comment: signatureComment,
        parameters: signatureParameters,
        returns: signatureReturns
    }
}

const handleObject = (memberType) => {
    if (!memberType || !memberType.children || !Array.isArray(memberType.children)) return {type:"unknown"}
    
    const propertyIds = memberType.groups?.find((g) => g.title == "Properties")?.children ?? []
    const methodIds = memberType.groups?.find((g) => g.title == "Methods")?.children ?? []

    const objectChildren = []
    for (const member of (memberType.children ?? [])){
        const memberName = member.name
        const memberType = propertyIds.includes(member.id) ? "property" : methodIds.includes(member.id) ? "method" : "other"
        let memberComment = member.comment?.summary?.map((c) => c.text).join("") ?? null
        
        const rawMemberSource = member.sources ? (member.sources[0] ?? null) : null
        let memberSource = rawMemberSource ? rawMemberSource.fileName + ":" + rawMemberSource.line + ":" + rawMemberSource.character : null

        let memberDetails = null
        if (memberType == "property"){
            memberDetails = handleType(member.type)
        } else if (memberType == "method"){
            memberDetails = handleFunction(member)
            memberComment = memberDetails.comment
        }

        objectChildren.push({
            type: memberType,
            name: memberName,
            comment: memberComment,
            source: memberSource,
            details: memberDetails
        })
    }
    return {type: "object", children: objectChildren}
}

const handleType = (memberType) => {
    if (!memberType || !memberType.type) return {type:"unknown"}
    else if (memberType.type == "intrinsic") return {type:"primitive", name: memberType.name}
    else if (memberType.type == "array") return {type:"array", child: handleType(memberType.elementType)}
    else if (memberType.type == "union") return {type:"union", children: memberType.types.map((t) => handleType(t))}
    else if (memberType.type == "intersection") return {type:"intersection", children: memberType.types.map((t) => handleType(t))}
    else if (memberType.type == "reference"){
        const referenceTypeArguments = (memberType.typeArguments) ? memberType.typeArguments.map((ta) => handleType(ta)) : null
        let referenceType = availableElements.find((el) => el.name == memberType.name)?.type ?? null

        if (referenceType){
            return {type:"reference", name: memberType.name, target: referenceType, typeArguments: referenceTypeArguments}
        } else if (memberType.package){
            if (memberType.package == "typescript") return {type:"internal", name: memberType.name, typeArguments: referenceTypeArguments}
            if (memberType.package == "open-ticket" && memberType.refersToTypeParameter) return {type:"typeParam", name: memberType.name, typeArguments: referenceTypeArguments}
            else return {type:"external", package: memberType.package, name: memberType.name, typeArguments: referenceTypeArguments}
        } else return {type:"unknown"}
    }
    else if (memberType.type == "literal") return {type:"literal", name: (typeof memberType.value == "string") ? JSON.stringify(memberType.value) : String(memberType.value)}
    else if (memberType.type == "typeOperator"){
        if (memberType.operator == "keyof") return {type:"keyof", child: handleType(memberType.target)}
        else if (memberType.operator == "readonly") return {type:"readonly", child: handleType(memberType.target)}
        else if (memberType.operator == "unique") return {type:"unique", child: handleType(memberType.target)}
    }
    else if (memberType.type == "conditional") return {
        type:"conditional",
        checker: handleType(memberType.checkType),
        extends: handleType(memberType.extendsType),
        trueValue: handleType(memberType.trueType),
        falseValue: handleType(memberType.falseType)
    }
    else if (memberType.type == "indexedAccess") return {type:"index", index: handleType(memberType.indexType), object: handleType(memberType.objectType)}
    else if (memberType.type == "mapped") return {type:"mapped", parameterName: memberType.parameter, parameter: handleType(memberType.parameterType), template: handleType(memberType.templateType)}
    else if (memberType.type == "optional") return {type:"optional", child: handleType(memberType.elementType)}
    else if (memberType.type == "predicate") return {type:"predicate", name: memberType.name, target: handleType(memberType.targetType)}
    else if (memberType.type == "query") return {type:"query", target: handleType(memberType.queryType)}
    else if (memberType.type == "rest") return {type:"rest", child: handleType(memberType.elementType)}
    else if (memberType.type == "tuple") return {type:"tuple", children: memberType.elements.map((t) => handleType(t))}
    else if (memberType.type == "templateLiteral") return {
        type:"template",
        head: memberType.head,
        tails: memberType.tail.map((t) => {
            return {element: handleType(t[0]), text: t[1]}
        })
    }
    else if (memberType.type == "reflection" && memberType.declaration && memberType.declaration.signatures && memberType.declaration.signatures[0]){
        return handleFunction(memberType.declaration)
    }
    else if (memberType.type == "reflection"){
        return handleObject(memberType.declaration)
    }
    else return {type:"unknown"}
}

// Thu thập tất cả các phần tử có sẵn trong dự án
for (const file of result.children){
    const classIds = file.groups?.find((g) => g.title == "Classes")?.children ?? []
    const interfaceIds = file.groups?.find((g) => g.title == "Interfaces")?.children ?? []
    const typeIds = file.groups?.find((g) => g.title == "Type Aliases")?.children ?? []
    const enumIds = file.groups?.find((g) => g.title == "Enumerations")?.children ?? []
    const varIds = file.groups?.find((g) => g.title == "Variables")?.children ?? []
    const funcIds = file.groups?.find((g) => g.title == "Functions")?.children ?? []

    for (const declaration of file.children ?? []){
        const declarationName = declaration.name
        const declarationType = classIds.includes(declaration.id) ? "class" : interfaceIds.includes(declaration.id) ? "interface" : typeIds.includes(declaration.id) ? "type" : enumIds.includes(declaration.id) ? "enum" : varIds.includes(declaration.id) ? "variable" : funcIds.includes(declaration.id) ? "function" : "other"
        availableElements.push({name: declarationName, type: declarationType})
    }
}

const exported = []
for (const file of result.children){
    const classIds = file.groups?.find((g) => g.title == "Classes")?.children ?? []
    const interfaceIds = file.groups?.find((g) => g.title == "Interfaces")?.children ?? []
    const typeIds = file.groups?.find((g) => g.title == "Type Aliases")?.children ?? []
    const enumIds = file.groups?.find((g) => g.title == "Enumerations")?.children ?? []
    const varIds = file.groups?.find((g) => g.title == "Variables")?.children ?? []
    const funcIds = file.groups?.find((g) => g.title == "Functions")?.children ?? []

    for (const declaration of (file.children ?? [])){
        const declarationName = declaration.name
        if (skipElementNames.includes(declarationName)) continue

        const declarationType = classIds.includes(declaration.id) ? "class" : interfaceIds.includes(declaration.id) ? "interface" : typeIds.includes(declaration.id) ? "type" : enumIds.includes(declaration.id) ? "enum" : varIds.includes(declaration.id) ? "variable" : funcIds.includes(declaration.id) ? "function" : "other"
        const declarationTypeParams = (declaration.typeParameters) ? declaration.typeParameters.map((tp) => {
            return {name: tp.name, type: handleType(tp.type)}
        }) : null
        const declarationComment = declaration.comment?.summary?.map((c) => c.text).join("") ?? null
        const declarationConstant = declaration.flags.isConst ? true : false
        
        const rawDeclarationSource = declaration.sources ? (declaration.sources[0] ?? null) : null
        const declarationSource = rawDeclarationSource ? rawDeclarationSource.fileName + ":" + rawDeclarationSource.line + ":" + rawDeclarationSource.character : null

        const declarationChildren = []

        // Xử lý từng loại declaration
        if (declarationType == "class"){
            const constructorIds = declaration.groups?.find((g) => g.title == "Constructors")?.children ?? []
            const propertyIds = declaration.groups?.find((g) => g.title == "Properties")?.children ?? []
            const methodIds = declaration.groups?.find((g) => g.title == "Methods")?.children ?? []

            for (const member of (declaration.children ?? [])){
                const memberName = member.name
                const memberType = constructorIds.includes(member.id) ? "constructor" : propertyIds.includes(member.id) ? "property" : methodIds.includes(member.id) ? "method" : "other"
                let memberComment = member.comment?.summary?.map((c) => c.text).join("") ?? null
                
                const rawMemberSource = member.sources ? (member.sources[0] ?? null) : null
                let memberSource = rawMemberSource ? rawMemberSource.fileName + ":" + rawMemberSource.line + ":" + rawMemberSource.character : null

                const memberInherited = member.flags.isInherited ? true : false
                const memberStatic = member.flags.isStatic ? true : false
                const memberProtected = member.flags.isProtected ? true : false
                const memberOptional = member.flags.isOptional ? true : false
                const memberReadonly = member.flags.isReadonly ? true : false

                let memberDetails = null
                if (memberType == "property"){
                    memberDetails = handleType(member.type)
                } else if (memberType == "method"){
                    memberDetails = handleFunction(member)
                    memberComment = memberDetails.comment
                } else if (memberType == "constructor"){
                    memberDetails = handleFunction(member)
                    memberComment = memberDetails.comment
                }

                declarationChildren.push({
                    type: memberType,
                    name: memberName,
                    comment: memberComment,
                    source: memberSource,
                    details: memberDetails,
                    inherited: memberInherited,
                    static: memberStatic,
                    protected: memberProtected,
                    optional: memberOptional,
                    readonly: memberReadonly
                })
            }
        } else if (declarationType == "interface"){
            const propertyIds = declaration.groups?.find((g) => g.title == "Properties")?.children ?? []
            const methodIds = declaration.groups?.find((g) => g.title == "Methods")?.children ?? []

            for (const member of (declaration.children ?? [])){
                const memberName = member.name
                const memberType = propertyIds.includes(member.id) ? "property" : methodIds.includes(member.id) ? "method" : "other"
                let memberComment = member.comment?.summary?.map((c) => c.text).join("") ?? null
                
                const rawMemberSource = member.sources ? (member.sources[0] ?? null) : null
                let memberSource = rawMemberSource ? rawMemberSource.fileName + ":" + rawMemberSource.line + ":" + rawMemberSource.character : null

                const memberInherited = member.flags.isInherited ? true : false
                const memberStatic = member.flags.isStatic ? true : false
                const memberProtected = member.flags.isProtected ? true : false
                const memberOptional = member.flags.isOptional ? true : false
                const memberReadonly = member.flags.isReadonly ? true : false

                let memberDetails = null
                if (memberType == "property"){
                    memberDetails = handleType(member.type)
                } else if (memberType == "method"){
                    memberDetails = handleFunction(member)
                    memberComment = memberDetails.comment
                }

                declarationChildren.push({
                    type: memberType,
                    name: memberName,
                    comment: memberComment,
                    source: memberSource,
                    details: memberDetails,
                    inherited: memberInherited,
                    static: memberStatic,
                    protected: memberProtected,
                    optional: memberOptional,
                    readonly: memberReadonly
                })
            }
        } else if (declarationType == "type"){
            declarationChildren.push(handleType(declaration.type))
        } else if (declarationType == "enum"){
            const enumerableIds = declaration.groups?.find((g) => g.title == "Enumeration Members")?.children ?? []

            for (const member of (declaration.children ?? [])){
                const memberName = member.name
                const memberType = enumerableIds.includes(member.id) ? "enumerable" : "other"
                const memberComment = member.comment?.summary?.map((c) => c.text).join("") ?? null
                
                const rawMemberSource = member.sources ? (member.sources[0] ?? null) : null
                let memberSource = rawMemberSource ? rawMemberSource.fileName + ":" + rawMemberSource.line + ":" + rawMemberSource.character : null

                let memberDetails = null
                if (memberType == "enumerable"){
                    memberDetails = handleType(member.type)
                }

                const memberInherited = member.flags.isInherited ? true : false
                const memberStatic = member.flags.isStatic ? true : false
                const memberProtected = member.flags.isProtected ? true : false
                const memberOptional = member.flags.isOptional ? true : false
                const memberReadonly = member.flags.isReadonly ? true : false

                declarationChildren.push({
                    type: memberType,
                    name: memberName,
                    comment: memberComment,
                    source: memberSource,
                    details: memberDetails,
                    inherited: memberInherited,
                    static: memberStatic,
                    protected: memberProtected,
                    optional: memberOptional,
                    readonly: memberReadonly
                })
            }
        } else if (declarationType == "variable"){
            declarationChildren.push(handleType(declaration.type))
        } else if (declarationType == "function"){
            declarationChildren.push(handleFunction(declaration))
        }

        exported.push({
            type: declarationType,
            name: declarationName,
            comment: declarationComment,
            constant: declarationConstant,
            source: declarationSource,
            children: declarationChildren,
            typeParams: declarationTypeParams
        })
    }
}

// Ghi kết quả cuối cùng
fs.writeFileSync(".docs/result.json", JSON.stringify(exported, null, "\t"))
fs.rmSync(".docs/typedoc-result.json")

console.log("PumpkinMC NetWork: Tạo tài liệu API thành công! File result.json đã được tạo trong thư mục .docs/")