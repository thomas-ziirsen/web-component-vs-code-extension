// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import get = require("lodash.get");
import has = require("lodash.has");
// import beautifyHtml = require("js-beautify");

// Get stuff from Colton's ext.
import html_1 = require("./client/providers/html");
import css_1 = require("./client/providers/css");
import hover_1 = require("./client/providers/hover");
import formatting_1 = require("./client/providers/formatting");
import { HTMLBeautifyOptions, html_beautify, js_beautify, JSBeautifyOptions } from 'js-beautify';

//
class DocumentWatcher {

    private disposable: any;
    private lastPointer = 0;

    constructor() {

        const subscriptions = [];

        subscriptions.push(vscode.workspace.onWillSaveTextDocument(event => {
            // Check JS/TS
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId === 'typescript' ||
                editor?.document.languageId === 'javascript' ||
                editor?.document.fileName.endsWith('.ts') ||
                editor?.document.fileName.endsWith('.js')) {
                    this.saveContent();
            }
        }));

        subscriptions.push(vscode.commands.registerCommand('formatHtmlInWebComponent.format', (event) => {
            this.saveContent();           
        }));

        this.disposable = vscode.Disposable.from.apply(this, subscriptions);
    }

    private saveContent(): void {

        const editor = vscode.window.activeTextEditor;
        const cursor = editor?.selection.active;

        if (!editor || !cursor) {
            return;
        }

        const config = vscode.workspace.getConfiguration();
        const indentSize: number = get(config, 'editor.tabSize') || 2;
        const last = editor?.document.lineAt(editor.document.lineCount - 1);
        const range = new vscode.Range(new vscode.Position(0, 0), last?.range?.end);

        this.doPreSaveTransformations(indentSize).then((content: any) => {
            editor?.edit(edit => {
                if (content !== '') {
                    edit.replace(range, content);
                }
            }).then(success => {
                if (success && content !== '') {
                    const origSelection = new vscode.Selection(cursor, cursor);
                    editor.selection = origSelection;
                }
            });
        });
    }

    dispose() {
        this.disposable.dispose();
    }

    doPreSaveTransformations(workspaceIndentSize: number) {
        return new Promise((resolve, reject) => {
            const config = vscode.workspace.getConfiguration();

            // Check TS
            const editor = vscode.window.activeTextEditor;
            const tsScopedFormat = has(config, '[typescript]');
            let tsScopedFormatVal = false;
            if (tsScopedFormat || editor?.document.fileName.endsWith('.ts')) {
                const tsScopedObj = get(config, '[typescript]');
                if (tsScopedObj['editor.formatOnSave'] || editor?.document.fileName.endsWith('.ts')) {
                    tsScopedFormatVal = true;
                }
            }

            // Check JS
            const jsScopedFormat = has(config, '[javascript]');
            let jsScopedFormatVal = false;
            if (jsScopedFormat) {
                const jsScopedObj = get(config, '[javascript]');
                if (jsScopedObj['editor.formatOnSave'] || editor?.document.fileName.endsWith('.js')) {
                    jsScopedFormatVal = true;
                }
            }

            // Format code
            if (config.editor.formatOnSave === true || tsScopedFormatVal || jsScopedFormatVal) {
                const html = vscode?.window?.activeTextEditor?.document.getText() ?? "";

                // eslint-disable-next-line @typescript-eslint/naming-convention
                const htmlOptions: HTMLBeautifyOptions = { indent_size: workspaceIndentSize };
                
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const jsOptions: JSBeautifyOptions = { indent_size: workspaceIndentSize};

                const formattedHtml = html_beautify(html, htmlOptions);
                const formattedJS = js_beautify(formattedHtml, jsOptions);

                try {
                    this.lastPointer = 0;

                    // Format HTML
                    const getAllChunks = formattedJS.toString().match(/(\*html\*)/gm) || [];

                    let loops = 0;
                    let combinedCode = '';

                    while (loops < getAllChunks?.length) {
                        loops++;
                        combinedCode += this.formatCodeChunk(formattedJS, this.lastPointer, loops, getAllChunks?.length);
                    }

                    // // Format CSS
                    // this.lastPointer = 0;
                    // const getAllCssChunks = formattedJS.toString().match(/(\*css\*)/gm) || [];

                    // // const getAllChunks = formattedJS.toString().match(/(\*html\*)/gm);
                    // let loops = 0;
                    // let combinedCode = '';

                    // while (loops < getAllCssChunks?.length) {
                    // 	loops++;
                    // 	combinedCode += this.formatCodeChunk(formattedJS, this.lastPointer, loops, getAllCssChunks?.length);
                    // }

                    resolve(combinedCode);
                }
                catch (ex) {
                    resolve(formattedJS);
                }
            }

            reject("Failed to do pre-save transformation");
        });
    }

    formatCodeChunk(formattedJS: string, lastPointer: number, iteration: number, end: number) {

        try {
            const getInnerHtmlStartIndex = formattedJS.indexOf("/*html*/", lastPointer);
            const getInnerHtmlCodeStartIndex = formattedJS.indexOf("`", getInnerHtmlStartIndex);
            const getInnerHtmlCodeEndIndex = formattedJS.indexOf("`", getInnerHtmlCodeStartIndex + 1);

            // Get indentation level from where innerHtml starts
            const indentLevelOfInnerHTML = formattedJS.substring(lastPointer + 1, getInnerHtmlStartIndex);
            const listOfLinesfromStart = indentLevelOfInnerHTML.split('\n');
            const innerHtmlLine = listOfLinesfromStart[listOfLinesfromStart.length - 1];
            const getTabIndent = innerHtmlLine.substring(0, innerHtmlLine.search(/(const|let|var|this)/gm));

            // Get the html chunk
            const chunk = formattedJS.substring(getInnerHtmlCodeStartIndex, getInnerHtmlCodeEndIndex);
            const listOfLines = chunk.split('\n');

            // Add indent
            for (let i = 0; i < listOfLines.length; i++) {
                // Check if line only contains string literal start, then don't indent
                if (listOfLines[i] !== '`' && i > 0) {
                    listOfLines[i] = `${getTabIndent}${listOfLines[i]}`;
                }
            }

            // Get before and after code
            const codeChunkStart = formattedJS.substring(lastPointer, getInnerHtmlCodeStartIndex);

            let codeChunkEnd = '';
            if (iteration === end) {
                codeChunkEnd = formattedJS.substring(getInnerHtmlCodeEndIndex);
            }

            this.lastPointer = getInnerHtmlCodeEndIndex;

            // Combine all code again
            const combinedCode = `${codeChunkStart}${listOfLines.join('\n')}${codeChunkEnd}`;

            return combinedCode;
        }
        catch (ex) {
            return formattedJS;
        }
    }
}


export function activate(context: vscode.ExtensionContext) {
    const docWatch = new DocumentWatcher();
    context.subscriptions.push(docWatch);

    new formatting_1.CodeFormatterProvider();
    vscode.languages.registerCompletionItemProvider(['typescript', 'javascript'], new html_1.HTMLCompletionItemProvider(), '<', '!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
    // vscode.languages.registerHoverProvider([ 'typescript', 'javascript' ], new hover_1.HTMLHoverProvider());
    vscode.languages.registerCompletionItemProvider(['typescript', 'javascript'], new css_1.HTMLStyleCompletionItemProvider(), '!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
    // vscode.languages.registerHoverProvider([ 'typescript', 'javascript' ], new hover_1.CSSHoverProvider());
    vscode.languages.registerCompletionItemProvider(['typescript', 'javascript'], new css_1.CSSCompletionItemProvider(), '!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

}

export function deactivate() { }