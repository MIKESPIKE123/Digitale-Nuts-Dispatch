# 🐛 Debug & Development Setup
## Vaststellingen Management Systeem

## 🚀 Snelle Start Opties

### **Methode 1: Direct File (Eenvoudigst)**
1. Open VS Code
2. Druk op `F5` of ga naar Run & Debug 
3. Kies: **"🚀 Vaststellingen App (Direct File)"**
4. ✅ Browser opent direct met index.html

### **Methode 2: HTTP Server (Aanbevolen voor development)**
1. Open terminal in VS Code (`Ctrl + \``)
2. Ga naar project folder: `cd "projectmap.v4"`
3. Start Python server: `python -m http.server 8000`
4. Ga naar Run & Debug → **"🌐 Vaststellingen App (localhost:8000)"**
5. ✅ App draait op http://localhost:8000/index.html

### **Methode 3: Node.js Server (Voor advanced features)**
1. Open terminal in `projectmap.v4` folder
2. Run: `node server.js`
3. Ga naar: http://localhost:8000/
4. ✅ Custom server met CORS support en fallbacks

## 🔧 Debug Configuraties

| Configuratie | Poort | Gebruik Voor |
|-------------|-------|-------------|
| **Direct File** | N.v.t. | Snelle tests, geen server nodig |
| **localhost:8000** | 8000 | Standaard development |
| **localhost:8080** | 8080 | Alternative poort |
| **Debug Mode** | 3000 | Extended debugging |

## ⚠️ Troubleshooting

### **"ERR_CONNECTION_REFUSED"**
```bash
# Probleem: Server niet gestart
# Oplossing: Start HTTP server eerst
cd "projectmap.v4"
python -m http.server 8000
# Of gebruik Node.js server
node server.js
```

### **"Bestand niet gevonden"**
```bash
# Controleer of je in de juiste folder zit
pwd  # Should show ...WEBSITE VASTSTELLINGEN
ls projectmap.v4/  # Should show index.html
```

### **CORS Errors**
- ✅ **Oplossing**: Gebruik HTTP server, niet direct file opening
- ✅ **Node.js server** heeft automatische CORS headers

## 📋 VS Code Taken

Druk `Ctrl+Shift+P` → Type "Tasks: Run Task" → Kies:

- **🚀 Quick Start - Direct File** - Open direct in browser
- **Start HTTP Server Port 8000** - Python server starten  
- **Start HTTP Server Port 8080** - Alternative poort
- **Start Node HTTP Server Port 8000** - Node.js server

## 🎯 Development Workflow

1. **Start server** (kies één methode):
   ```bash
   # Python (eenvoudig)
   python -m http.server 8000
   
   # Node.js (advanced)  
   node server.js
   
   # NPX (als http-server geïnstalleerd)
   npx http-server -p 8000 -c-1
   ```

2. **Start debug** in VS Code:
   - `F5` → Kies juiste configuratie
   - Browser opent automatisch
   - Breakpoints werken in VS Code

3. **Live development**:
   - Wijzig code in VS Code
   - Refresh browser (`F5`)
   - Debug in browser DevTools (`F12`)

## 💡 Tips

- **Auto-refresh**: Gebruik Live Server extension voor VS Code
- **Network access**: Server is toegankelijk via IP op LAN
- **Multiple ports**: Run verschillende versies parallel
- **Backup**: Gebruik git voor versie controle

## 📞 Support

Bij problemen:
1. Check console errors (`F12` → Console)
2. Verify server is running (`localhost:8000` in browser)
3. Check VS Code terminal voor errors
4. Restart VS Code als debug niet werkt