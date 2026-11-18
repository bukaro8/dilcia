"use client";
import Image from "next/image";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import { Activity, ArrowRight, CircleAlert, ChartNoAxesCombined, Check, ClipboardList, Download, Droplet, FileText, LogOut, Pencil, ShieldCheck, Sprout, TriangleAlert, Trash2, Wifi, WifiOff } from "lucide-react";
import { CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis } from "recharts";
import {classify,moments,type Moment} from "@/lib/glucose";
type Reading={id:string; moment:Moment; value:number; comment:string|null; measuredAt:string};
const options = [
  ["FASTING", moments.FASTING, "/illustrations/glucometro-ayunas.png"],
  ["AFTER_LUNCH", moments.AFTER_LUNCH, "/illustrations/glucometro-almuerzo.png"],
  ["BEFORE_DINNER", moments.BEFORE_DINNER, "/illustrations/glucometro-cena.png"],
] as const;
const destinations = [
  ["Registrar", Droplet],
  ["Mis mediciones", ClipboardList],
  ["Mi evolución", ChartNoAxesCombined],
  ["Informe médico", FileText],
] as const;
function londonInputDate(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).reduce((a,x)=>({...a,[x.type]:x.value}),{} as Record<string,string>);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`}
function londonToUTC(s:string){const [date,time]=s.split("T"),[y,m,d]=date.split("-").map(Number),[h,mi]=time.split(":").map(Number),guess=Date.UTC(y,m-1,d,h,mi);const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(guess)).reduce((a,x)=>({...a,[x.type]:x.value}),{} as Record<string,string>);const represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);return new Date(guess+(guess-represented)).toISOString()}
export default function Home(){
 const [showPassword,setShowPassword]=useState(false);
 const [signingIn,setSigningIn]=useState(false);
 const signInLock=useRef(false);
 const [patientName,setPatientName]=useState<string | null>(null);
 const [tab,setTab]=useState("Registrar"),[moment,setMoment]=useState<Moment>("FASTING"),[value,setValue]=useState(""),[comment,setComment]=useState(""),[when,setWhen]=useState(""),[readings,setReadings]=useState<Reading[]>([]),[online,setOnline]=useState(true),[logged,setLogged]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[range,setRange]=useState(30),[message,setMessage]=useState(""),[saving,setSaving]=useState(false);const saveLock=useRef(false);
 async function load(){setOnline(navigator.onLine);const r=await fetch("/api/measurements");if(r.status===401){setLogged(false);return}if(r.ok){setReadings(await r.json());setLogged(true);void fetch("/api/auth",{cache:"no-store"}).then(async profile=>{if(profile.ok)setPatientName((await profile.json()).name)}).catch(()=>{})}}
 useEffect(()=>{setWhen(londonInputDate());load();const fn=()=>setOnline(navigator.onLine);window.addEventListener("online",fn);window.addEventListener("offline",fn);return()=>{window.removeEventListener("online",fn);window.removeEventListener("offline",fn)}},[]);
 const filtered=useMemo(()=>readings.filter(r=>Date.now()-new Date(r.measuredAt).getTime()<=range*86400000),[readings,range]);
 const chart=useMemo(()=>filtered.map(r=>({fecha:new Intl.DateTimeFormat("es-GB",{day:"2-digit",month:"short",timeZone:"Europe/London"}).format(new Date(r.measuredAt)),ayunas:r.moment==="FASTING"?r.value:null,almuerzo:r.moment==="AFTER_LUNCH"?r.value:null,cena:r.moment==="BEFORE_DINNER"?r.value:null})).reverse(),[filtered]);
 const reportChart=useMemo(()=>filtered.map(r=>({fecha:new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",timeZone:"Europe/London"}).format(new Date(r.measuredAt)),ayunas:r.moment==="FASTING"?r.value:null,almuerzo:r.moment==="AFTER_LUNCH"?r.value:null,cena:r.moment==="BEFORE_DINNER"?r.value:null})).reverse(),[filtered]);
 const safeMessage=(s:string)=>{setMessage(s);setTimeout(()=>setMessage(""),4500)};
 async function login(event: React.FormEvent) {
   event.preventDefault();
   if (signInLock.current) return;
   signInLock.current = true;
   setSigningIn(true);
   setMessage("");
   try {
     const response = await fetch("/api/auth", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ email: email.trim(), password }),
     });
     if (response.ok) {
       setPassword("");
       setShowPassword(false);
       setLogged(true);
       await load();
     } else {
       setMessage(response.status === 429
         ? "Has hecho demasiados intentos. Prueba en unos minutos."
         : "Comprueba tu correo y tu contraseña.");
     }
   } catch {
     setMessage("Comprueba tu conexión e inténtalo de nuevo.");
   } finally {
     signInLock.current = false;
     setSigningIn(false);
   }
 }

 async function save(e:React.FormEvent){e.preventDefault();if(saveLock.current)return;const n=Number(value.replace(",","."));if(!Number.isFinite(n)||n<0.1||n>99){safeMessage("Escribe un valor válido en mmol/L.");return}saveLock.current=true;setSaving(true);try{const r=await fetch("/api/measurements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({moment,value:n,comment,measuredAt:londonToUTC(when),requestKey:crypto.randomUUID()})});if(r.ok){setValue("");setComment("");await load();safeMessage("Medición guardada correctamente")}else safeMessage("No se pudo guardar la medición.")}catch{safeMessage("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.")}finally{saveLock.current=false;setSaving(false)}}
 async function remove(id:string){if(!confirm("¿Quieres eliminar esta medición? Esta acción no se puede deshacer."))return;await fetch(`/api/measurements/${id}`,{method:"DELETE"});load()}
 async function edit(r:Reading){const v=prompt("Nuevo resultado en mmol/L",String(r.value));if(v===null)return;const n=Number(v.replace(",","."));if(!Number.isFinite(n)||n<=0)return safeMessage("Escribe un valor válido.");await fetch(`/api/measurements/${r.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:n})});load()}
 const exportCSV=()=>{const rows=[["Fecha","Hora","Momento","Glucosa (mmol/L)","Estado","Comentario"],...readings.map(r=>{const d=new Date(r.measuredAt);return [d.toLocaleDateString("es-GB",{timeZone:"Europe/London"}),d.toLocaleTimeString("es-GB",{timeZone:"Europe/London",hour:"2-digit",minute:"2-digit"}),moments[r.moment],r.value,({low:"Hipoglucemia",high:"Por encima",in:"En objetivo"} as Record<string,string>)[classify(r.value,r.moment)],r.comment||""]})];const blob=new Blob(["\ufeff"+rows.map(row=>row.map(x=>`"${String(x).replaceAll('"','""')}"`).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="glucomi.csv";a.click()};
 const report=()=>{const priorTitle=document.title,priorLang=document.documentElement.lang;document.title="GlucoMi — Medical Report";document.documentElement.lang="en";window.addEventListener("afterprint",()=>{document.title=priorTitle;document.documentElement.lang=priorLang},{once:true});window.print()};
 if (!logged) return <main className="login login-welcome">
   <div className="login-layout">
     <header className="login-intro">
       <div className="login-intro-copy">
         <h1>Gluco<span>Mi</span></h1>
         <p>Tu compañero para llevar un registro de tu glucosa.</p>
       </div>
       <Image
         className="login-mascot"
         src="/illustrations/glucometro-ayunas.png"
         alt=""
         width={256}
         height={256}
         priority
         unoptimized
       />
     </header>
     <section className="login-card login-access" aria-labelledby="login-title">
       <h2 id="login-title">Entra en tu cuenta</h2>
       <form onSubmit={login} aria-busy={signingIn}>
         <label htmlFor="login-email">Correo electrónico</label>
         <input id="login-email" name="email" type="email" autoComplete="username"
           autoCapitalize="none" spellCheck={false} required value={email}
           onChange={event => setEmail(event.target.value)} />
         <label htmlFor="login-password">Contraseña</label>
         <div className="login-password">
           <input id="login-password" name="password" type={showPassword ? "text" : "password"}
             autoComplete="current-password" required value={password}
             onChange={event => setPassword(event.target.value)} />
           <button type="button" className="password-toggle" aria-controls="login-password"
             onClick={() => setShowPassword(visible => !visible)}>
             {showPassword ? "Ocultar" : "Mostrar"}
           </button>
         </div>
         {message && <p className="login-error" role="alert">{message}</p>}
         <button className="primary" disabled={signingIn}>
           {signingIn ? "Entrando…" : "Iniciar sesión"}
         </button>
       </form>
       <div className="account-links">
         <Link href="/cuenta/recuperar">¿Olvidaste tu contraseña?</Link>
         <Link href="/cuenta/registro">Crear una cuenta</Link>
       </div>
     </section>
   </div>
 </main>;

 return <main className="app"><header className="topbar"><button type="button" className="logo" onClick={()=>setTab("Registrar")}><span className="brandmark small"><Image src="/icons/glucometro-192.png" alt="" width={37} height={37} unoptimized /></span><b>Gluco<i>Mi</i></b></button><span className={`connection ${online?"":"offline"}`}>{online?<Wifi size={15}/>:<WifiOff size={15}/>} {online?"Conectada":"Sin conexión"}</span><button className="icon-button" aria-label="Cerrar sesión" onClick={async()=>{await fetch("/api/auth",{method:"DELETE"});setPatientName(null);setLogged(false)}}><LogOut size={19}/></button></header>
 <div className="content"><div className="welcome"><div><p className="eyebrow">{new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long",timeZone:"Europe/London"}).format(new Date()).toLocaleUpperCase("es-ES")}</p><h1>{patientName ? `Hola, ${patientName}` : "Hola"}</h1></div><div className="welcome-art" aria-hidden="true"><div className="welcome-symbol"><Activity strokeWidth={1.45}/></div></div></div>
 {tab==="Registrar"&&<section className="panel form-panel"><div className="panel-title"><div className="round-icon mint"><Droplet aria-hidden="true"/></div><div><h2>Vamos a registrar tu glucosa</h2></div></div><form onSubmit={save}><fieldset><legend>¿Cuándo hiciste la medición?</legend><div className="moment-grid">{options.map(([key,label,illustration])=><button type="button" key={key} aria-pressed={moment===key} onClick={()=>setMoment(key)} className={`moment ${moment===key?"selected":""}`}><span className="moment-illustration" aria-hidden="true"><Image src={illustration} alt="" width={200} height={200} unoptimized /></span><b>{label}</b><span className="radio" aria-hidden="true">{moment===key&&<Check size={12} strokeWidth={2.8}/>}</span></button>)}</div></fieldset><label className="value-label">Tu resultado <span>mmol/L</span><div className="value-wrap"><input inputMode="decimal" type="text" pattern="[0-9]+([.,][0-9]{1,2})?" placeholder="— — , —" aria-label="Resultado de glucosa en mmol por litro" value={value} onChange={e=>setValue(e.target.value)}/><span>mmol/L</span></div></label>{value&&Number.isFinite(Number(value.replace(",",".")))&&Number(value.replace(",","."))<4&&<div className="hypo-alert" role="alert"><b><TriangleAlert size={19} aria-hidden="true"/> Alerta de hipoglucemia</b><p>Esta lectura está por debajo de 4,0 mmol/L. Si estás despierta y puedes tragar con seguridad, el NHS recomienda tomar algo azucarado de acción rápida, como un vaso pequeño de zumo o 5 tabletas de glucosa. Vuelve a medir en 10–15 minutos; si sigue por debajo de 4, repite.</p><p>Cuando te encuentres mejor y la lectura supere 4, toma algo que ayude a mantenerla, como un tentempié o tu próxima comida.</p><strong>Si no respondes con normalidad o estás inconsciente, quien te acompaña debe llamar al 999. No debe darte comida ni bebida; colócate en posición de recuperación.</strong><small>Fuente: <a href="https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/" target="_blank" rel="noreferrer">NHS — Hipoglucemia</a></small></div>}{value&&Number.isFinite(Number(value.replace(",",".")))&&Number(value.replace(",","."))>=4&&classify(Number(value.replace(",",".")),moment)==="high"&&<div className="high-alert" role="status"><b><CircleAlert size={19} aria-hidden="true"/> Por encima de tu objetivo</b><p>Esta medición está por encima de tu objetivo. Compártela con tu médico; una lectura aislada no es un diagnóstico.</p></div>}<div className="date-row"><label>Fecha y hora<input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label><p>Se registra según hora local de Londres</p></div><label>Nota (opcional)<textarea placeholder="¿Cómo te encuentras?" rows={2} value={comment} onChange={e=>setComment(e.target.value)}/></label><button className="primary save" disabled={saving}>{saving?"Guardando…":"Guardar medición"} <ArrowRight size={19} aria-hidden="true"/></button>{message&&<p className="feedback" role="status">{message}</p>}<p className="privacy-note"><ShieldCheck size={15}/> Tus datos están protegidos y solo tú puedes verlos.</p></form></section>}
 {tab==="Mis mediciones"&&<section className="panel"><div className="section-head"><div><h2>Mis mediciones</h2><p>Tu historial, siempre a mano</p></div><span className="count-pill">{readings.length} registros</span></div><div className="readings">{readings.length===0?<div className="empty"><span className="empty-icon"><Sprout aria-hidden="true"/></span><h3>Aquí comienza tu seguimiento</h3><p>Cuando guardes una medición, aparecerá aquí.</p><button className="secondary" onClick={()=>setTab("Registrar")}>Registrar medición</button></div>:readings.map(r=>{const state=classify(r.value,r.moment);return <article className="reading" key={r.id}><div className={`reading-dot ${state}`}/><div className="reading-main"><b>{r.value.toFixed(1)} <small>mmol/L</small></b><span>{moments[r.moment]}</span><small>{new Intl.DateTimeFormat("es-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/London"}).format(new Date(r.measuredAt))}</small>{r.comment&&<p>{r.comment}</p>}<em className={`badge ${state}`}>{state==="low"?"Hipoglucemia":state==="high"?"Sobre tu objetivo":"En tu objetivo"}</em></div><div className="row-actions"><button aria-label="Editar" onClick={()=>edit(r)}><Pencil size={17}/></button><button aria-label="Eliminar" onClick={()=>remove(r.id)}><Trash2 size={17}/></button></div></article>})}</div></section>}
 {tab==="Mi evolución"&&<section className="panel"><div className="section-head"><div><h2>Mi evolución</h2><p>Cada lectura ayuda a ver el conjunto</p></div><ChartNoAxesCombined color="#75a894"/></div><div className="ranges">{[7,30,90].map(n=><button className={range===n?"active":""} onClick={()=>setRange(n)} key={n}>Últimos {n} días</button>)}</div><div className="stats"><div><span>Mediciones</span><b>{filtered.length}</b></div><div><span>Promedio general</span><b>{filtered.length?(filtered.reduce((a,r)=>a+r.value,0)/filtered.length).toFixed(1):"—"}<small> mmol/L</small></b></div><div><span>Dentro del objetivo</span><b>{filtered.length?Math.round(filtered.filter(r=>classify(r.value,r.moment)==="in").length/filtered.length*100):0}<small>%</small></b></div></div><div className="chart"><ResponsiveContainer width="100%" height={280}><LineChart data={chart} margin={{left:-20,right:15,top:10,bottom:5}}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9efeb"/><XAxis dataKey="fecha" tick={{fontSize:12,fill:"#79857f"}}/><YAxis domain={[0,"auto"]} tick={{fontSize:12,fill:"#79857f"}}/><Tooltip formatter={(v)=>[`${v} mmol/L`,"Glucosa"]}/><Line type="monotone" connectNulls={false} dataKey="ayunas" name="En ayunas" stroke="#5b9a7a" strokeWidth={3} dot={{r:4,fill:"#5b9a7a"}}/><Line type="monotone" connectNulls={false} dataKey="almuerzo" name="Después del almuerzo" stroke="#6d9eb2" strokeWidth={3} dot={{r:4,fill:"#6d9eb2"}}/><Line type="monotone" connectNulls={false} dataKey="cena" name="Antes de cenar" stroke="#d7a64d" strokeWidth={3} dot={{r:4,fill:"#d7a64d"}}/></LineChart></ResponsiveContainer></div><div className="legend"><span><i className="green"/> En ayunas</span><span><i className="blue"/> Después del almuerzo</span><span><i className="gold"/> Antes de cenar</span></div><div className="disclaimer">Las tendencias ayudan a conversar con tu equipo médico y no son un diagnóstico.</div></section>}
 {tab==="Informe médico"&&<section className="panel"><div className="section-head"><div><h2>Informe para mi médico</h2><p>Un resumen claro para vuestra próxima consulta</p></div><div className="round-icon blue"><ClipboardList/></div></div><div className="report-preview"><div className="report-head"><Activity size={20} aria-hidden="true"/><div><h3>GlucoMi</h3>{patientName&&<p>Patient: {patientName}</p>}<p>Glucose monitoring report · {range} days · generated {new Intl.DateTimeFormat("en-GB",{dateStyle:"long",timeZone:"Europe/London"}).format(new Date())}</p></div></div><div className="stats"><div><span>Readings</span><b>{filtered.length}</b></div><div><span>Overall average</span><b>{filtered.length?(filtered.reduce((a,r)=>a+r.value,0)/filtered.length).toFixed(1):"—"} <small>mmol/L</small></b></div><div><span>Minimum / maximum</span><b>{filtered.length?`${Math.min(...filtered.map(r=>r.value)).toFixed(1)}–${Math.max(...filtered.map(r=>r.value)).toFixed(1)}`:"—"}</b></div></div><div className="stats by-moment">{options.map(([m,label])=>{const rs=filtered.filter(r=>r.moment===m);return <div key={m}><span>Average · {({FASTING:"Fasting",AFTER_LUNCH:"2 hours after lunch",BEFORE_DINNER:"Before dinner"} as Record<Moment,string>)[m]}</span><b>{rs.length?(rs.reduce((a,r)=>a+r.value,0)/rs.length).toFixed(1):"—"} <small>mmol/L</small></b></div>})}</div><p className="outside-count">Within target: <b>{filtered.length?Math.round(filtered.filter(r=>classify(r.value,r.moment)==="in").length/filtered.length*100):0}%</b> · Outside target: <b>{filtered.filter(r=>classify(r.value,r.moment)!=="in").length}</b> · Low: <b>{filtered.filter(r=>classify(r.value,r.moment)==="low").length}</b> · High: <b>{filtered.filter(r=>classify(r.value,r.moment)==="high").length}</b></p><div className="targets"><b>General guidance targets used</b><p>Fasting: 4.0–7.0 mmol/L · 2 hours after lunch: below 8.5 mmol/L · Before dinner: 4.0–7.0 mmol/L · Hypoglycaemia: any reading below 4.0 mmol/L.</p><p className="muted">These are general guidance values. The patient’s doctor may set different targets based on her individual circumstances. This report is not a diagnosis.</p></div><h4>Glucose trends by time of day</h4><div className="chart report-chart"><ResponsiveContainer width="100%" height={210}><LineChart data={reportChart} margin={{left:-20,right:10,top:10,bottom:5}}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9efeb"/><XAxis dataKey="fecha" tick={{fontSize:10,fill:"#79857f"}}/><YAxis domain={[0,"auto"]} tick={{fontSize:10,fill:"#79857f"}}/><Tooltip formatter={(v)=>[`${v} mmol/L`]}/><Line type="monotone" connectNulls={false} dataKey="ayunas" name="Fasting" stroke="#5b9a7a" dot={{r:3}}/><Line type="monotone" connectNulls={false} dataKey="almuerzo" name="After lunch" stroke="#6d9eb2" dot={{r:3}}/><Line type="monotone" connectNulls={false} dataKey="cena" name="Before dinner" stroke="#d7a64d" dot={{r:3}}/></LineChart></ResponsiveContainer></div><h4>Detailed readings</h4><div className="table-scroll"><table><thead><tr><th>Date and time</th><th>Time of day</th><th>Reading</th><th>Status</th><th>Comment</th></tr></thead><tbody>{filtered.map(r=>{const s=classify(r.value,r.moment);return <tr key={r.id}><td>{new Intl.DateTimeFormat("en-GB",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/London"}).format(new Date(r.measuredAt))}</td><td>{({FASTING:"Fasting",AFTER_LUNCH:"2 hours after lunch",BEFORE_DINNER:"Before dinner"} as Record<Moment,string>)[r.moment]}</td><td>{r.value.toFixed(1)} mmol/L</td><td>{s==="low"?"Hypoglycaemia":s==="high"?"Above target":"Within target"}</td><td>{r.comment||"—"}</td></tr>})}</tbody></table></div></div><div className="report-actions"><div className="ranges">{[7,30,90].map(n=><button className={range===n?"active":""} onClick={()=>setRange(n)} key={n}>{n} días</button>)}</div><button className="primary" onClick={report}><Download size={18}/> Descargar informe PDF</button><button className="secondary" onClick={async()=>{if(navigator.share){const data={title:"GlucoMi — Glucose report",text:`Summary of ${filtered.length} readings. Targets: fasting 4–7, 2 hours after lunch <8.5, and before dinner 4–7 mmol/L.`};await navigator.share(data)}else report()}}>Compartir informe</button><button className="text-button" onClick={exportCSV}>Exportar datos a CSV</button></div><p className="disclaimer">This report supports glucose tracking; it is not a diagnosis and does not replace advice from a healthcare professional.</p></section>}
 </div><nav className="bottom-nav" aria-label="Navegación principal">{destinations.map(([name,Icon])=><button key={name} aria-current={tab===name?"page":undefined} className={tab===name?"active":""} onClick={()=>setTab(name)}><span className="nav-icon"><Icon aria-hidden="true" size={21} strokeWidth={1.8}/></span><span>{name}</span></button>)}</nav></main>
}
