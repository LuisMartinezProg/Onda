/* Cadena de audio: ecualizador, sonido amplio, limitador */
/* ---- Audio: EQ, sonido amplio, limitador ---- */
function init(){if(ctx)return;ctx=new AudioContext({latencyHint:'playback'});const g=v=>{const x=ctx.createGain();x.gain.value=v;return x},src=ctx.createMediaElementSource(A),pre=g(1),fade=g(1),nrm=g(1),
 eq=[32,64,125,250,500,1e3,2e3,4e3,8e3,16e3].map(f=>{const b=ctx.createBiquadFilter();b.type='peaking';b.frequency.value=f;b.Q.value=1.1;return b}),
 bs=ctx.createBiquadFilter(),sp=ctx.createChannelSplitter(2),mg=ctx.createChannelMerger(2),mid=g(1),side=g(1),neg=g(-1),cp=ctx.createDynamicsCompressor(),an=ctx.createAnalyser();
 bs.type='lowshelf';bs.frequency.value=100;an.fftSize=128;an.smoothingTimeConstant=.8;cp.threshold.value=-8;cp.ratio.value=8;
 [pre,...eq,bs,sp].reduce((a,b)=>(a.connect(b),b));src.connect(fade);fade.connect(nrm);nrm.connect(pre);
 [[0,.5,mid],[1,.5,mid],[0,.5,side],[1,-.5,side]].forEach(([c,v,t])=>{const x=g(v);sp.connect(x,c);x.connect(t)});
 mid.connect(mg,0,0);side.connect(mg,0,0);mid.connect(mg,0,1);side.connect(neg);neg.connect(mg,0,1);mg.connect(cp);cp.connect(an);an.connect(ctx.destination);
 N={src,pre,fade,nrm,eq,bs,side,an};fx()}
function fx(){if(!ctx)return;N.pre.gain.value=S.pre;N.eq.forEach((b,i)=>b.gain.value=S.eq[i]);N.bs.gain.value=S.bass;N.side.gain.value=S.wid;N.src.disconnect();N.src.connect(S.eco?ctx.destination:N.fade)}
