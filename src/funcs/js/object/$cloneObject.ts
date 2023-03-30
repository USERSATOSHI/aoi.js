import { TranspilerError } from "../../../core/error.js";
import Scope from "../../../core/structs/Scope.js";
import { StringObject, parseStringObject } from "../../../index.js";
import { FunctionData, funcData } from "../../../typings/interfaces.js";
import { escapeResult, escapeVars } from "../../../util/transpilerHelpers.js";
export const $cloneObject: FunctionData = {
    name: "$cloneObject",
    brackets: true,
    optional: false,
    type: "setter",
    version: "7.0.0",
    fields: [
        {
            name: "name",
            type: "string",
            required: true,
        },
        {
            name: "name",
            type: "string",
            required: true,
        },
    ],
    description: "clones an Object",
    default: ["void", "void"],
    returns: "void",
    code: (data: funcData, scope: Scope[]) => {
        const currentScope = scope[scope.length - 1];
        const [name, target] = data.splits;
        if (
            !currentScope.objects[name] &&
            !currentScope.name.startsWith("$try_") &&
            !currentScope.name.startsWith("$catch_")
        ) {
            throw new TranspilerError(
                `${data.name}: Invalid Object Name Provided`,
            );
        }
        currentScope.objects[target] = currentScope.objects[name];
        const res = escapeResult(
            `const ${escapeVars(target)} =  ${escapeVars(name)};`,
        );
        currentScope.update(res, data);
        return {
            code: "",
            scope,
        };
    },
};
