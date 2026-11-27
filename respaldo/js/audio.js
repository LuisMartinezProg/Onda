/* Cadena de audio: ecualizador, sonido amplio, normalizar volumen, limitador y medidor */
/* ---- Audio: EQ, sonido amplio, limitador ---- */
/* Antes "normalizar" no hacía nada y venía al 100%: se apaga una vez y desde ahí manda el usuario */
try { if (!localStorage.getItem('onda.norm.mig')) { S.norm = 0; saveS(); localStorage.setItem('onda.norm.mig', '1'); } } catch (e) {}
function init(){if(ctx)return;ctx=new AudioContext({latencyHint:'playback'});const g=v=>{const x=ctx.createGain();x.gain.value=v;return x},src=ctx.createMediaElementSource(A),pre=g(1),fade=g(1),nrm=g(1),
 eq=[32,64,125,250,500,1e3,2e3,4e3,8e3,16e3].map(f=>{const b=ctx.createBiquadFilter();b.type='peaking';b.frequency.value=f;b.Q.value=1.1;return b}),
 bs=ctx.createBiquadFilter(),sp=ctx.createChannelSplitter(2),mg=ctx.createChannelMerger(2),mid=g(1),side=g(1),neg=g(-1),cp=ctx.createDynamicsCompressor(),an=ctx.createAnalyser(),meter=ctx.createAnalyser();
 bs.type='lowshelf';bs.frequency.value=100;an.fftSize=128;an.smoothingTimeConstant=.8;cp.threshold.value=-8;cp.ratio.value=8;meter.fftSize=1024;meter.smoothingTimeConstant=0;
 [pre,...eq,bs,sp].reduce((a,b)=>(a.connect(b),b));src.connect(fade);fade.connect(nrm);nrm.connect(pre);
 [[0,.5,mid],[1,.5,mid],[0,.5,side],[1,-.5,side]].forEach(([c,v,t])=>{const x=g(v);sp.connect(x,c);x.connect(t)});
 mid.connect(mg,0,0);side.connect(mg,0,0);mid.connect(mg,0,1);side.connect(neg);neg.connect(mg,0,1);mg.connect(cp);cp.connect(an);cp.connect(meter);an.connect(ctx.destination);
 N={src,pre,fade,nrm,eq,bs,side,cp,an,meter,eco:false};fx()}
/* Los cambios son suaves (setTargetAtTime) y la conexión solo se toca si cambia el modo ahorro: así mover una barra nunca corta el audio */
function fx(){if(!ctx)return;const t=ctx.currentTime,k=.02,sg=(p,v)=>p.setTargetAtTime(v,t,k);
 sg(N.pre.gain,S.pre);N.eq.forEach((b,i)=>sg(b.gain,S.eq[i]));sg(N.bs.gain,S.bass);sg(N.side.gain,S.wid);
 const n=Math.max(0,Math.min(1,+S.norm||0));sg(N.nrm.gain,1+.25*n);sg(N.cp.threshold,-8-10*n);
 const eco=!!S.eco;if(N.eco!==eco){N.eco=eco;N.src.disconnect();N.src.connect(eco?ctx.destination:N.fade)}}