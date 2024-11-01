import * as vscode from 'vscode';
import * as path from 'path';

class DebugCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        if (!document.fileName.endsWith('_spec.rb')) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('it ') || lines[i].trim().startsWith('describe ')) {
                const range = new vscode.Range(i, 0, i, lines[i].length);
                const command: vscode.Command = {
                    title: '$(debug-alt) Run',
                    command: 'rspec-runner.debugRubySpec',
                    tooltip: 'Debug this spec',
                    arguments: [document.uri, range.start.line]
                };
                codeLenses.push(new vscode.CodeLens(range, command));
            }
        }

        return codeLenses;
    }
}

let rspecTerminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext) {
    const codeLensProvider = new DebugCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'ruby', pattern: '**/*_spec.rb' }, codeLensProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rspec-runner.debugRubySpec', debugRubySpec)
    );

    // const debugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    // debugButton.text = '$(debug-alt) Debug Spec';
    // debugButton.tooltip = 'Run this spec file in RSpec';
    // debugButton.command = 'rspec-runner.debugEntireRubySpec';
    // context.subscriptions.push(debugButton);

    context.subscriptions.push(
        vscode.commands.registerCommand('rspec-runner.debugEntireRubySpec', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.fileName.endsWith('_spec.rb')) {
                debugRubySpec(editor.document.uri, 0);
            }
        })
    );

    // context.subscriptions.push(
    //     vscode.window.onDidChangeActiveTextEditor(editor => {
    //         if (editor && editor.document.fileName.endsWith('_spec.rb')) {
    //             debugButton.show();
    //         } else {
    //             debugButton.hide();
    //         }
    //     })
    // );

    // if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.endsWith('_spec.rb')) {
    //     debugButton.show();
    // }

    context.subscriptions.push({
        dispose: () => {
            if (rspecTerminal) {
                rspecTerminal.dispose();
            }
        }
    });
}

async function debugRubySpec(uri: vscode.Uri, line: number) {
    const fullPath = uri.fsPath;
    const specIndex = fullPath.indexOf('spec/');
    let relativePath: string;

    if (specIndex !== -1) {
        relativePath = fullPath.substring(specIndex);
    } else {
        relativePath = path.basename(fullPath);
    }

    if (!rspecTerminal || rspecTerminal.exitStatus !== undefined) {
        rspecTerminal = vscode.window.createTerminal('RSpec Runner');
    }
    rspecTerminal.show();

    const rspecCommand = line === 0
        ? `ave bundle exec rspec ${relativePath}`
        : `ave bundle exec rspec ${relativePath}:${line + 1}`;

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
        rspecTerminal.sendText(`cd "${workspaceFolder.uri.fsPath}"`);
    }

    rspecTerminal.sendText(rspecCommand);

    vscode.window.showInformationMessage(`Running ${relativePath}${line === 0 ? '' : ` at line ${line + 1}`}`);
}

export function deactivate() {}
