let editor = null;
let pyodideInstance = null;
let currentWorkspace = 'python'; // 'python' | 'web' | 'dart'
let currentWebTab = 'html'; // 'html' | 'css' | 'js'

// Initial Code Storage
const codeStorage = {
    python: `# Studio Python Engine\nmenos_ruido_es_genial = True\n\nif menos_ruido_es_genial:\n    print("¡Visita menosruido.store para más herramientas!")`,
    web: {
        html: `<!DOCTYPE html>\n<html>\n<head>\n  <style>body { font-family: sans-serif; text-align: center; padding: 20px; }</style>\n</head>\n<body>\n  <h1>Hola desde Studio Web!</h1>\n  <button onclick="saludar()">Probar JS</button>\n</body>\n</html>`,
        css: `/* CSS Personalizado */\nh1 {\n  color: #ffffff;\n}`,
        js: `function saludar() {\n  alert('¡El Javascript está funcionando correctamente!');\n}`
    },
    dart: `// Simulador Flutter UI\nWidget build() {\n  return Container(\n    padding: 16,\n    child: Column(\n      children: [\n        Text('Bienvenido a Flutter Studio', style: TextStyle(fontSize: 20, bold: true)),\n        SizedBox(height: 10),\n        ElevatedButton('Click Aquí', onPressed: null)\n      ]\n    )\n  );\n}`
};

window.addEventListener('DOMContentLoaded', () => {
    initCodeMirror();
    initPyodideEngine();
});

// Initialize CodeMirror Editor Instance safely
function initCodeMirror() {
    const textarea = document.getElementById('code-editor');
    editor = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        autoCloseBrackets: true,
        matchBrackets: true,
        lineWrapping: true,
        extraKeys: {
            "Ctrl-Enter": function() { executeCode(); },
            "Cmd-Enter": function() { executeCode(); }
        }
    });

    editor.setValue(codeStorage.python);
    
    // Save state on change
    editor.on('change', () => {
        const val = editor.getValue();
        if (currentWorkspace === 'python') codeStorage.python = val;
        else if (currentWorkspace === 'dart') codeStorage.dart = val;
        else if (currentWorkspace === 'web') codeStorage.web[currentWebTab] = val;
    });
}

// Load Pyodide Wasm Engine
async function initPyodideEngine() {
    appendTerminal('Inicializando entorno de Python...');
    try {
        pyodideInstance = await loadPyodide({
            stdout: (text) => appendTerminal(text),
            stderr: (text) => appendTerminal(text, 'error')
        });
        appendTerminal('Engine Python listo.', 'success');
    } catch (err) {
        appendTerminal('Error al cargar Pyodide: ' + err.message, 'error');
    }
}

// Switch Workspace Modes
function switchWorkspace(mode) {
    currentWorkspace = mode;
    
    // Update active button styles
    document.getElementById('btn-mode-py').className = mode === 'python' ? 'px-3 py-1.5 text-xs font-semibold rounded-md bg-sky-500 text-slate-950' : 'px-3 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white';
    document.getElementById('btn-mode-web').className = mode === 'web' ? 'px-3 py-1.5 text-xs font-semibold rounded-md bg-sky-500 text-slate-950' : 'px-3 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white';
    document.getElementById('btn-mode-dart').className = mode === 'dart' ? 'px-3 py-1.5 text-xs font-semibold rounded-md bg-sky-500 text-slate-950' : 'px-3 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white';

    // Toggle subtabs visibility
    const webSubtabs = document.getElementById('web-subtabs');
    const consoleOutput = document.getElementById('console-output');
    const webPreview = document.getElementById('web-preview');
    const flutterPreview = document.getElementById('flutter-preview');

    if (mode === 'web') {
        webSubtabs.classList.remove('hidden');
        switchWebTab(currentWebTab);
        consoleOutput.classList.add('hidden');
        flutterPreview.classList.add('hidden');
        webPreview.classList.remove('hidden');
    } else if (mode === 'dart') {
        webSubtabs.classList.add('hidden');
        document.getElementById('current-filename').innerText = 'main.dart';
        editor.setOption('mode', 'clike');
        editor.setValue(codeStorage.dart);
        consoleOutput.classList.add('hidden');
        webPreview.classList.add('hidden');
        flutterPreview.classList.remove('hidden');
        renderFlutterUI();
    } else { // Python
        webSubtabs.classList.add('hidden');
        document.getElementById('current-filename').innerText = 'main.py';
        editor.setOption('mode', 'python');
        editor.setValue(codeStorage.python);
        webPreview.classList.add('hidden');
        flutterPreview.classList.add('hidden');
        consoleOutput.classList.remove('hidden');
    }
}

// Switch Web Subtabs
function switchWebTab(tab) {
    currentWebTab = tab;
    
    document.getElementById('tab-html').className = tab === 'html' ? 'px-2.5 py-1 text-xs rounded bg-sky-500/20 text-sky-300 font-mono' : 'px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-400 font-mono';
    document.getElementById('tab-css').className = tab === 'css' ? 'px-2.5 py-1 text-xs rounded bg-sky-500/20 text-sky-300 font-mono' : 'px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-400 font-mono';
    document.getElementById('tab-js').className = tab === 'js' ? 'px-2.5 py-1 text-xs rounded bg-sky-500/20 text-sky-300 font-mono' : 'px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-400 font-mono';

    if (tab === 'html') {
        document.getElementById('current-filename').innerText = 'index.html';
        editor.setOption('mode', 'htmlmixed');
        editor.setValue(codeStorage.web.html);
    } else if (tab === 'css') {
        document.getElementById('current-filename').innerText = 'style.css';
        editor.setOption('mode', 'css');
        editor.setValue(codeStorage.web.css);
    } else {
        document.getElementById('current-filename').innerText = 'script.js';
        editor.setOption('mode', 'javascript');
        editor.setValue(codeStorage.web.js);
    }
}

// Execute active workspace code
async function executeCode() {
    if (currentWorkspace === 'python') {
        if (!pyodideInstance) return appendTerminal('Pyodide aún no está listo', 'error');
        try {
            await pyodideInstance.runPythonAsync(editor.getValue());
        } catch (err) {
            appendTerminal(err.message, 'error');
        }
    } else if (currentWorkspace === 'web') {
        renderWebPreview();
    } else if (currentWorkspace === 'dart') {
        renderFlutterUI();
    }
}

// Render Web HTML + CSS + JS inside IFrame
function renderWebPreview() {
    const iframe = document.getElementById('web-preview');
    const html = codeStorage.web.html;
    const css = `<style>${codeStorage.web.css}</style>`;
    const js = `<script>${codeStorage.web.js}</script>`;

    const combinedDoc = html.replace('</head>', `${css}</head>`).replace('</body>', `${js}</body>`);
    iframe.srcdoc = combinedDoc;
}

// Lightweight Flutter UI Simulator Parser
function renderFlutterUI() {
    const stage = document.getElementById('flutter-stage');
    const code = editor.getValue();
    
    stage.innerHTML = '';
    
    if (code.includes('Column')) {
        const wrapper = document.createElement('div');
        wrapper.className = "flex flex-col gap-3 items-center text-center p-2";
        wrapper.innerHTML = `
            <h2 class="text-lg font-bold text-sky-400">Flutter UI View</h2>
            <p class="text-xs text-slate-300">App desplegada correctamente</p>
            <button class="px-4 py-2 bg-sky-500 text-slate-950 rounded-lg text-xs font-bold shadow hover:bg-sky-400">Botón de Acción</button>
        `;
        stage.appendChild(wrapper);
    } else {
        stage.innerHTML = `<div class="text-xs text-slate-400 p-2">Escribe estructura Flutter/Dart para generar UI</div>`;
    }
}

// Terminal Append Output Helpers
function appendTerminal(msg, type = 'info') {
    const consoleOutput = document.getElementById('console-output');
    const line = document.createElement('div');
    if (type === 'error') line.className = 'text-rose-400 font-mono';
    else if (type === 'success') line.className = 'text-emerald-400 font-mono';
    else line.className = 'text-slate-300 font-mono';
    
    line.textContent = msg;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearCurrentOutput() {
    document.getElementById('console-output').innerHTML = '';
}

// Touch Keyboard Helper Functions
function insertSymbol(sym) {
    if (editor) {
        const doc = editor.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(sym, cursor);
        editor.focus();
    }
}
