/* Vista: Ajustes (perfiles, carpetas, fondos, apariencia) */
function viewSettings(v){
  v.innerHTML=`<h2>Ajustes</h2><h2 style="font-size:16px">Perfiles</h2><div class="ctl">Perfil activo<select id="pf">${PFS.map(p=>`<option value="${p.id}"${p.id==PF?' selected':''}>${esc(p.name)}</option>`).join('')}</select><span></span></div><div class="pre"><input id="pn" class="chip" placeholder="Nombre del perfil" maxlength="24"><button class="chip" data-x="np">Crear perfil</button><button class="chip" data-x="rn">Renombrar este</button>${PF!='default'?'<button class="chip" data-x="dp">Eliminar este perfil</button>':''}</div><h2 style="font-size:16px">Carpetas de este perfil</h2>${(window.FOL||[]).map(f=>`<div class="pre"><span style="flex:1;word-break:break-all">${esc(f)}</span><button class="chip" data-x="rf" data-d="${esc(f)}">Quitar</button></div>`).join('')||'<p style="color:var(--dim)">Ninguna todavía.</p>'}<h2 style="font-size:16px">Fondo por sección</h2>${bgUI()}<h2 style="font-size:16px">Apariencia y consumo</h2>
<div class="ctl">Tipografía<select id="font-selector" style="width:100%; padding:8px; border-radius:8px; background:var(--gl); color:var(--ink); border:1px solid var(--ed); outline:none;">
  <option value="segoe" ${(!S.font || S.font==='segoe' || S.font==='inter')?'selected':''}>Segoe UI (Por defecto)</option>
  <option value="bahnschrift" ${S.font==='bahnschrift'?'selected':''}>Bahnschrift (Moderna)</option>
  <option value="century" ${S.font==='century'?'selected':''}>Century Gothic (Elegante)</option>
  <option value="trebuchet" ${S.font==='trebuchet'?'selected':''}>Trebuchet MS (Limpia)</option>
  <option value="palatino" ${S.font==='palatino'?'selected':''}>Palatino (Serif Premium)</option>
  <option value="impact" ${S.font==='impact'?'selected':''}>Impact (Cartel)</option>
  <option value="script" ${S.font==='script'?'selected':''}>Segoe Script (Manuscrita)</option>
  <option value="consolas" ${S.font==='consolas'?'selected':''}>Consolas (Código)</option>
</select><span></span></div>

<div class="ctl">Efectos visuales (Karaoke)
  <select id="edge-fx-select" style="width:100%; padding:8px; border-radius:8px; background:var(--gl); color:var(--ink); border:1px solid var(--ed); outline:none;">
    <option value="off" ${(!S.edgeFx || S.edgeFx === 'off') ? 'selected' : ''}>Desactivado</option>
    <option value="neon" ${S.edgeFx === 'neon' ? 'selected' : ''}>Neón Reactivo (Impactante)</option>
    <option value="soft" ${S.edgeFx === 'soft' ? 'selected' : ''}>Pulso Sutil (Elegante)</option>
  </select>
</div>


 <label class="ctl"><span>Negro puro (AMOLED)</span><input type="checkbox" data-k="amo" ${S.amo?'checked':''}></label>
 <label class="ctl"><span>Modo ahorro (sin efectos ni visualizador)</span><input type="checkbox" data-k="eco" ${S.eco?'checked':''}></label>
 <div class="pre"><button class="chip" data-x="out">Cerrar sesión</button><button class="chip" data-x="re">Reconectar carpetas</button><button class="chip" data-x="cl">Borrar biblioteca</button></div><p style="color:var(--dim);max-width:520px">Las canciones no se copian: Onda solo recuerda dónde están. Si el navegador pide permiso al volver, pulsa «Reconectar carpetas».</p>`;

  setTimeout(() => {
    // Selector de fuente
    const fsSelect = document.getElementById("font-selector");
    if (fsSelect) {
      fsSelect.onchange = (e) => {
        S.font = e.target.value;
        if (typeof saveS === 'function') saveS();
        window.applyFont(S.font);
      };
    }
    // Selector de efectos
    const fxSelect = document.getElementById("edge-fx-select");
    if (fxSelect) {
      fxSelect.onchange = (e) => {
        S.edgeFx = e.target.value;
        if (typeof saveS === 'function') saveS();
        document.body.classList.remove('fx-neon', 'fx-soft');
        if (S.edgeFx === 'neon') document.body.classList.add('fx-neon');
        if (S.edgeFx === 'soft') document.body.classList.add('fx-soft');
      };
    }
  }, 50);
}