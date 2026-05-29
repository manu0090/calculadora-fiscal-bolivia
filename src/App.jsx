import { useState, useMemo } from "react";

// ── UTILS ────────────────────────────────────────────────────────────────────
const fmt  = n => Number(n).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = n => Math.abs(n) >= 1000 ? (n/1000).toFixed(1)+"k" : Number(n).toFixed(0);
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const mesCorto = m => MESES[m-1]?.slice(0,3) ?? "";

// ── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  // Primarios
  blue:    "#2563EB", blue50:  "#EFF6FF", blue100: "#DBEAFE", blue700: "#1D4ED8",
  green:   "#16A34A", green50: "#F0FDF4", green100:"#DCFCE7",
  red:     "#DC2626", red50:   "#FEF2F2",
  amber:   "#D97706", amber50: "#FFFBEB",
  purple:  "#7C3AED", purple50:"#F5F3FF",
  orange:  "#EA580C", cyan:    "#0891B2", teal: "#0D9488",
  // Grises
  g900: "#0F172A", g800: "#1E293B", g700: "#334155", g600: "#475569",
  g500: "#64748B", g400: "#94A3B8", g300: "#CBD5E1", g200: "#E2E8F0",
  g150: "#EDF0F4", g100: "#F1F5F9", g50:  "#F8FAFC", white: "#FFFFFF",
  bg:   "#F0F4F8",
};

const TIER_COL = { moto_dentro: T.orange, moto_fuera: T.amber, auto_dentro: T.cyan, auto_fuera: T.teal };
const TIERS = [
  { id:"moto_dentro", icon:"🛵", label:"Moto — Dentro", sub:"Dentro del perímetro"    },
  { id:"moto_fuera",  icon:"🛵", label:"Moto — Fuera",  sub:"Fuera del perímetro"      },
  { id:"auto_dentro", icon:"🚗", label:"Auto — Dentro", sub:"Dentro de la cobertura"  },
  { id:"auto_fuera",  icon:"🚗", label:"Auto — Fuera",  sub:"Fuera de la cobertura"   },
];

const initInc = () => Object.fromEntries(TIERS.map(t => [t.id, { qty:"", price:"" }]));
const initDel = () => Object.fromEntries(TIERS.map(t => [t.id, { qty:"", price:"", factura:false }]));

// ── CALC ENGINE ──────────────────────────────────────────────────────────────
function engine(income, delivery, facturas) {
  const FC = parseFloat(facturas)||0;
  const incT = TIERS.map(t => { const q=parseFloat(income[t.id].qty)||0, p=parseFloat(income[t.id].price)||0; return {...t,qty:q,price:p,total:q*p}; });
  const pedidos = incT.reduce((s,t)=>s+t.qty,0);
  const ing     = incT.reduce((s,t)=>s+t.total,0);
  const delT = TIERS.map(t => { const q=parseFloat(delivery[t.id].qty)||0, p=parseFloat(delivery[t.id].price)||0, f=delivery[t.id].factura, tot=q*p; return {...t,qty:q,price:p,fact:f,total:tot,ivaC:f?tot*0.13:0,ded:f?tot:0}; });
  const delTotal  = delT.reduce((s,t)=>s+t.total,0);
  const delConF   = delT.filter(t=>t.fact).reduce((s,t)=>s+t.total,0);
  const delSinF   = delT.filter(t=>!t.fact).reduce((s,t)=>s+t.total,0);
  const ivaCredDel= delT.reduce((s,t)=>s+t.ivaC,0);
  const dedDel    = delT.reduce((s,t)=>s+t.ded,0);
  const ivaDb     = ing*0.13;
  const ivaCredC  = FC*0.13;
  const ivaCredT  = ivaCredC+ivaCredDel;
  const ivaPagar  = Math.max(0,ivaDb-ivaCredT);
  const ivaFavor  = Math.max(0,ivaCredT-ivaDb);
  const cobIva    = ivaDb>0?Math.min((ivaCredT/ivaDb)*100,100):0;
  const it        = ing*0.03;
  const impTotal  = it+ivaPagar;
  const bolsillo  = ing-impTotal-delTotal;
  const porPedido = pedidos>0?bolsillo/pedidos:0;
  const margen    = ing>0?(bolsillo/ing)*100:0;
  const dedAnual  = (FC+dedDel)*12;
  const utilidad  = Math.max(0,ing*12-dedAnual);
  const iue       = utilidad*0.25;
  const ahorro    = iue/12;
  const mesesSinIT= it>0?Math.floor(iue/it):0;
  return { FC,incT,delT,pedidos,ing,delTotal,delConF,delSinF,ivaCredDel,dedDel,ivaDb,ivaCredC,ivaCredT,ivaPagar,ivaFavor,cobIva,it,impTotal,bolsillo,porPedido,margen,dedAnual,utilidad,iue,ahorro,mesesSinIT };
}

// ── BASE UI COMPONENTS ───────────────────────────────────────────────────────

// Screen wrapper
const Screen = ({ children, pad=true }) => (
  <div style={{ padding: pad?"18px 16px 32px":0 }}>{children}</div>
);

// Section title
const Sec = ({ label, mt }) => (
  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.g400, marginBottom:10, marginTop:mt||0 }}>{label}</div>
);

// Card
const Card = ({ children, style, p="14px 16px" }) => (
  <div style={{ background:T.white, borderRadius:18, border:`1px solid ${T.g200}`, overflow:"hidden", ...style }}>
    {p ? <div style={{ padding:p }}>{children}</div> : children}
  </div>
);

// Colored stat box
const StatBox = ({ label, value, sub, col, style }) => (
  <div style={{ background:`${col}0d`, borderRadius:14, border:`1px solid ${col}22`, padding:"11px 13px", ...style }}>
    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:T.g400, marginBottom:5 }}>{label}</div>
    <div style={{ fontSize:15, fontWeight:700, color:col, lineHeight:1.1 }}>{value}</div>
    {sub && <div style={{ fontSize:10, color:T.g400, marginTop:4 }}>{sub}</div>}
  </div>
);

// Row in a detail list
const Row = ({ label, value, col, sub, bold, last }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:last?0:`1px solid ${T.g100}` }}>
    <div style={{ fontSize:sub?12:13, color:sub?T.g400:T.g700, paddingLeft:sub?10:0, flex:1, paddingRight:8, lineHeight:1.3 }}>{label}</div>
    <div style={{ fontSize:13, fontWeight:bold||col?700:400, color:col||T.g700, whiteSpace:"nowrap" }}>{value}</div>
  </div>
);

// Progress bar
const Bar = ({ pct, col, h=6 }) => (
  <div style={{ height:h, background:T.g150, borderRadius:99, overflow:"hidden" }}>
    <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:col||T.blue, borderRadius:99, transition:"width 0.5s" }} />
  </div>
);

// Badge pill
const Badge = ({ children, col }) => (
  <span style={{ display:"inline-flex", alignItems:"center", background:`${col}18`, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700, color:col }}>{children}</span>
);

// Number input
const Num = ({ value, onChange, col, placeholder }) => (
  <input type="number" min="0" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"0"}
    style={{ background:T.g50, border:`1.5px solid ${col}44`, borderRadius:10, padding:"9px 12px", fontSize:17, fontWeight:700, color:T.g900, width:"100%", outline:"none", boxSizing:"border-box" }} />
);

// Primary button
const Btn = ({ children, onClick, col, outline, sm }) => (
  <button onClick={onClick} style={{ background:outline?`${col||T.blue}0e`:col||T.blue, border:outline?`1.5px solid ${col||T.blue}44`:"none", borderRadius:13, padding:sm?"10px 0":"14px 0", color:outline?col||T.blue:T.white, fontWeight:700, fontSize:sm?13:15, width:"100%", cursor:"pointer", letterSpacing:"0.01em" }}>
    {children}
  </button>
);

// Mini bar chart
const Bars = ({ data, col }) => {
  const max = Math.max(...data.map(d=>d.v), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:50 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div style={{ width:"100%", height:42, display:"flex", alignItems:"flex-end", background:`${col}12`, borderRadius:"4px 4px 0 0" }}>
            <div style={{ width:"100%", background:col, borderRadius:"4px 4px 0 0", height:`${Math.max((d.v/max)*42, d.v>0?3:0)}px`, transition:"height 0.4s" }} />
          </div>
          <div style={{ fontSize:8, color:T.g400, textAlign:"center" }}>{d.l}</div>
        </div>
      ))}
    </div>
  );
};

// Tier input card
const TierCard = ({ tier, row, onUpdate, showFact }) => {
  const col = TIER_COL[tier.id];
  const qty = parseFloat(row.qty)||0, price = parseFloat(row.price)||0, total = qty*price;
  return (
    <div style={{ background:T.white, borderRadius:16, border:`1.5px solid ${total>0?col+"44":T.g200}`, marginBottom:10, overflow:"hidden", transition:"border-color 0.2s" }}>
      <div style={{ background:`${col}09`, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${col}18` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:19 }}>{tier.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.g900 }}>{tier.label}</div>
            <div style={{ fontSize:10, color:T.g400 }}>{tier.sub}</div>
          </div>
        </div>
        {total>0 && <span style={{ fontSize:13, fontWeight:700, color:col }}>Bs. {fmt(total)}</span>}
      </div>
      <div style={{ padding:"12px 14px 10px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:5 }}>Pedidos/mes</div>
          <Num value={row.qty} onChange={v=>onUpdate(tier.id,"qty",v)} col={col} />
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:5 }}>{showFact?"Pago Bs.":"Precio Bs."}</div>
          <Num value={row.price} onChange={v=>onUpdate(tier.id,"price",v)} placeholder="0.00" col={col} />
        </div>
      </div>
      {showFact && (
        <div style={{ padding:"0 14px 12px" }}>
          <button onClick={()=>onUpdate(tier.id,"factura",!row.factura)}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px 0", borderRadius:10, background:row.factura?`${col}12`:T.g50, border:`1.5px solid ${row.factura?col+"55":T.g200}`, cursor:"pointer", fontSize:12, fontWeight:700, color:row.factura?col:T.g400, width:"100%", transition:"all 0.2s" }}>
            <span>{row.factura?"✅":"⬜"}</span>
            <span>{row.factura?"Con Factura — IVA crédito activo":"Sin Factura — No deducible IUE"}</span>
          </button>
        </div>
      )}
      {total>0 && !showFact && (
        <div style={{ padding:"4px 14px 10px", borderTop:`1px solid ${col}14`, fontSize:11, color:T.g400 }}>
          {fmt(qty)} × Bs. {fmt(price)} = <strong style={{ color:col }}>Bs. {fmt(total)}</strong>
        </div>
      )}
    </div>
  );
};

// Hero card (blue header card)
const Hero = ({ children, style }) => (
  <div style={{ background:T.blue, borderRadius:20, padding:"20px", marginBottom:14, position:"relative", overflow:"hidden", ...style }}>
    <div style={{ position:"absolute", right:-25, top:-25, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }} />
    <div style={{ position:"absolute", left:-20, bottom:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
    {children}
  </div>
);

const HeroLabel = ({ children }) => <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>{children}</div>;
const HeroVal   = ({ children, sm }) => <div style={{ fontSize:sm?13:36, fontWeight:800, color:T.white, lineHeight:1 }}>{children}</div>;
const HeroSub   = ({ children }) => <div style={{ fontSize:12, color:"rgba(255,255,255,0.60)", marginTop:3 }}>{children}</div>;
const HeroGrid  = ({ items }) => (
  <div style={{ display:"grid", gridTemplateColumns:`repeat(${items.length},1fr)`, gap:8, marginTop:14 }}>
    {items.map((k,i) => (
      <div key={i} style={{ background:"rgba(255,255,255,0.11)", borderRadius:11, padding:"8px 10px" }}>
        <HeroLabel>{k.label}</HeroLabel>
        <HeroVal sm>{k.value}</HeroVal>
      </div>
    ))}
  </div>
);

// ── SPLASH ───────────────────────────────────────────────────────────────────
function Splash({ onStart }) {
  return (
    <div style={{ minHeight:"100vh", background:T.blue, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 28px", fontFamily:"'Inter','Segoe UI',sans-serif", boxSizing:"border-box" }}>
      <div style={{ width:96, height:96, borderRadius:"50%", background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24, fontSize:46 }}>🇧🇴</div>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", color:"rgba(255,255,255,0.50)", marginBottom:10 }}>Bolivia · Régimen General NIT</div>
      <h1 style={{ fontSize:38, fontWeight:800, color:T.white, margin:"0 0 8px", textAlign:"center", lineHeight:1.1 }}>Calculadora<br/>Fiscal</h1>
      <p style={{ fontSize:14, color:"rgba(255,255,255,0.55)", margin:"0 0 44px", textAlign:"center", lineHeight:1.65 }}>IT · IVA · IUE para tu negocio de delivery</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:340, marginBottom:40 }}>
        {[
          { icon:"🏠", text:"Dashboard con resumen instantáneo" },
          { icon:"💵", text:"Ingresos por tipo y zona de cobertura" },
          { icon:"🧾", text:"Control de facturas y crédito IVA" },
          { icon:"📅", text:"Historial mensual con gráficos" },
          { icon:"🔮", text:"Simulador ¿qué pasa si...?" },
          { icon:"🔔", text:"Alertas de vencimientos fiscales" },
        ].map((f,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(255,255,255,0.10)", borderRadius:14, padding:"11px 14px" }}>
            <span style={{ fontSize:20, flexShrink:0 }}>{f.icon}</span>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.4 }}>{f.text}</span>
          </div>
        ))}
      </div>
      <div style={{ width:"100%", maxWidth:340 }}>
        <button onClick={onStart} style={{ background:T.white, borderRadius:16, padding:"16px 0", border:"none", cursor:"pointer", color:T.blue, fontWeight:800, fontSize:17, width:"100%" }}>Comenzar →</button>
        <p style={{ fontSize:11, color:"rgba(255,255,255,0.30)", marginTop:12, textAlign:"center" }}>Datos guardados solo en tu dispositivo</p>
      </div>
    </div>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ calc, mes, anio, historial, onNav }) {
  const vc = calc.bolsillo<0?T.red:calc.margen<10?T.amber:T.green;
  const vl = calc.bolsillo<0?"🚨 No Viable":calc.margen<10?"⚠️ Margen Ajustado":"✅ Negocio Viable";
  const has = calc.ing > 0;

  const ultimos6 = historial.slice(-6);
  const hBar = ultimos6.map(m => ({ l:mesCorto(m.mes), v:m.bolsillo }));

  // Alertas activas
  const hoy = new Date();
  const diasParaDia10 = (() => { const d = new Date(hoy.getFullYear(), hoy.getMonth(), 10); if(d<=hoy) d.setMonth(d.getMonth()+1); return Math.ceil((d-hoy)/86400000); })();
  const esAbril = hoy.getMonth()===3;

  return (
    <Screen>
      {/* Hero */}
      <Hero>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <HeroLabel>{MESES[mes-1]} {anio}</HeroLabel>
            <HeroVal>{has ? `Bs. ${fmt(calc.bolsillo)}` : "—"}</HeroVal>
            <HeroSub>bolsillo neto del mes</HeroSub>
          </div>
          <Badge col="rgba(255,255,255,0.80)">{vl}</Badge>
        </div>
        {has && <HeroGrid items={[
          { label:"Ingresos",   value:`Bs. ${fmtK(calc.ing)}`      },
          { label:"Impuestos",  value:`Bs. ${fmtK(calc.impTotal)}`  },
          { label:"Margen",     value:`${fmt(calc.margen)}%`        },
          { label:"Pedidos",    value:String(Math.round(calc.pedidos)) },
        ]} />}
        {!has && <div style={{ marginTop:12, fontSize:13, color:"rgba(255,255,255,0.50)" }}>Ingresá tus datos para ver el resumen →</div>}
      </Hero>

      {/* Accesos rápidos */}
      <Sec label="Acceso rápido" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[
          { icon:"💵", label:"Ingresos",    sub:"Precio por tipo/zona",  tab:"ingresos",    col:T.blue   },
          { icon:"🛵", label:"Repartidores",sub:"Pagos y facturas",      tab:"repartidores",col:T.orange  },
          { icon:"📊", label:"Resultados",  sub:"IT · IVA · IUE",        tab:"resultados",  col:T.purple  },
          { icon:"📅", label:"Historial",   sub:`${historial.length} meses`,tab:"historial",col:T.green  },
        ].map((a,i) => (
          <button key={i} onClick={()=>onNav(a.tab)}
            style={{ background:T.white, border:`1px solid ${T.g200}`, borderRadius:16, padding:"14px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:`${a.col}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0 }}>{a.icon}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.g900 }}>{a.label}</div>
              <div style={{ fontSize:10, color:T.g400, marginTop:1 }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Alertas */}
      {(diasParaDia10 <= 5 || esAbril) && (
        <>
          <Sec label="⚠️ Alertas activas" />
          {diasParaDia10 <= 5 && (
            <div style={{ background:T.amber50, border:`1px solid ${T.amber}44`, borderRadius:14, padding:"12px 14px", marginBottom:10, borderLeft:`4px solid ${T.amber}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.amber }}>Empozamiento IT — día 10</div>
              <div style={{ fontSize:12, color:T.g500, marginTop:3 }}>Faltan {diasParaDia10} días para empozar el IT de este mes (Formulario 400).</div>
            </div>
          )}
          {esAbril && (
            <div style={{ background:T.purple50, border:`1px solid ${T.purple}44`, borderRadius:14, padding:"12px 14px", marginBottom:10, borderLeft:`4px solid ${T.purple}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.purple }}>Vencimiento IUE — abril</div>
              <div style={{ fontSize:12, color:T.g500, marginTop:3 }}>El IUE anual vence el 29 de abril. Tenés que pagar Bs. {fmt(calc.iue)}.</div>
            </div>
          )}
        </>
      )}

      {/* Mini historial */}
      {historial.length >= 2 && (
        <>
          <Sec label="Evolución bolsillo" mt={4} />
          <Card style={{ marginBottom:14 }}>
            <Bars data={hBar} col={T.blue} />
          </Card>
        </>
      )}

      {/* KPIs fiscales */}
      {has && (
        <>
          <Sec label="Resumen fiscal este mes" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <StatBox label="IT (3%)"    value={`Bs. ${fmtK(calc.it)}`}       col={T.red}    />
            <StatBox label="IVA"        value={`Bs. ${fmtK(calc.ivaPagar)}`} col={T.blue}   />
            <StatBox label="IUE anual*" value={`Bs. ${fmtK(calc.iue)}`}      col={T.purple} />
          </div>
        </>
      )}
    </Screen>
  );
}

// ── INGRESOS ─────────────────────────────────────────────────────────────────
function Ingresos({ income, setInc, facturas, setFacturas, calc, onNext }) {
  const has = calc.ing > 0;
  const vc  = calc.bolsillo>=0?T.green:T.red;
  return (
    <Screen>
      {has && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          <StatBox label="Ingresos"  value={`Bs. ${fmtK(calc.ing)}`}       col={T.blue}  />
          <StatBox label="Impuestos" value={`Bs. ${fmtK(calc.impTotal)}`}   col={T.red}   />
          <StatBox label="Bolsillo"  value={`Bs. ${fmtK(calc.bolsillo)}`}   col={vc}      />
        </div>
      )}
      <Sec label="💵 Precio cobrado por tipo y zona" />
      {TIERS.map(t => <TierCard key={t.id} tier={t} row={income[t.id]} onUpdate={setInc} showFact={false} />)}

      <Sec label="🧾 Facturas de compras del negocio" mt={6} />
      <Card>
        <div style={{ fontSize:11, color:T.g400, marginBottom:8 }}>Total gastos con factura / mes (Bs.)</div>
        <Num value={facturas} onChange={setFacturas} placeholder="0.00" col={T.green} />
        {facturas && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, marginTop:12, borderTop:`1px solid ${T.g100}`, paddingTop:12 }}>
            {[
              { l:"IVA Crédito / mes",   v:`Bs. ${fmt((parseFloat(facturas)||0)*0.13)}` },
              { l:"Deducible IUE / año", v:`Bs. ${fmt((parseFloat(facturas)||0)*12)}`   },
            ].map((k,i) => (
              <div key={i} style={{ paddingRight:i===0?12:0, borderRight:i===0?`1px solid ${T.g100}`:0, paddingLeft:i===1?12:0 }}>
                <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:4 }}>{k.l}</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.green }}>{k.v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {has && <div style={{ marginTop:12 }}><Btn onClick={onNext}>Continuar → Repartidores</Btn></div>}
    </Screen>
  );
}

// ── REPARTIDORES ─────────────────────────────────────────────────────────────
function Repartidores({ delivery, setDel, calc, onNext }) {
  return (
    <Screen>
      <div style={{ background:T.blue50, border:`1px solid ${T.blue100}`, borderRadius:14, padding:"11px 14px", marginBottom:16, display:"flex", gap:10 }}>
        <span style={{ fontSize:17, flexShrink:0 }}>💡</span>
        <div style={{ fontSize:12, color:T.g600, lineHeight:1.6 }}>
          Activá <strong style={{ color:T.blue }}>Con Factura</strong> si el repartidor tiene NIT. Reduce tu IVA mensual y el IUE anual.
        </div>
      </div>
      <Sec label="🛵🚗 Pago a cada tipo de repartidor" />
      {TIERS.map(t => <TierCard key={t.id} tier={t} row={delivery[t.id]} onUpdate={setDel} showFact />)}

      {calc.delTotal > 0 && (
        <>
          <Sec label="Resumen" mt={6} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <StatBox label="Total / mes"       value={`Bs. ${fmt(calc.delTotal)}`}   col={T.blue}   />
            <StatBox label="Con Factura ✅"    value={`Bs. ${fmt(calc.delConF)}`}    col={T.green}  sub={`IVA crédito: Bs. ${fmt(calc.ivaCredDel)}`} />
            <StatBox label="Sin Factura ❌"    value={`Bs. ${fmt(calc.delSinF)}`}    col={T.red}    sub="No reduce IUE" />
            <StatBox label="Deducible IUE/año" value={`Bs. ${fmt(calc.dedDel*12)}`}  col={T.purple} sub="Solo con factura" />
          </div>
          {calc.delSinF > 0 && (
            <div style={{ background:T.red50, border:`1px solid ${T.red}33`, borderLeft:`4px solid ${T.red}`, borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.red, marginBottom:3 }}>⚠️ Bs. {fmt(calc.delSinF)} / mes sin factura</div>
              <div style={{ fontSize:12, color:T.g500, lineHeight:1.6 }}>Son <strong style={{ color:T.red }}>Bs. {fmt(calc.delSinF*12)} / año</strong> que el fisco no reconoce como gasto deducible. Exigí nota fiscal.</div>
            </div>
          )}
        </>
      )}
      <div style={{ marginTop:4 }}><Btn onClick={onNext}>Ver Resultados →</Btn></div>
    </Screen>
  );
}

// ── RESULTADOS ───────────────────────────────────────────────────────────────
function Resultados({ calc, mes, anio, onGuardar }) {
  if (!calc.ing) return (
    <Screen>
      <div style={{ textAlign:"center", padding:"40px 0" }}>
        <div style={{ fontSize:52, marginBottom:14 }}>📥</div>
        <div style={{ color:T.g400, fontSize:14, lineHeight:1.7 }}>Ingresá tus datos en <strong style={{ color:T.blue }}>Ingresos</strong> para ver el resumen fiscal.</div>
      </div>
    </Screen>
  );

  const vc = calc.bolsillo<0?T.red:calc.margen<10?T.amber:T.green;
  const vl = calc.bolsillo<0?"🚨 No Viable":calc.margen<10?"⚠️ Margen Ajustado":"✅ Negocio Viable";

  return (
    <Screen>
      {/* Hero */}
      <Hero>
        <Badge col="rgba(255,255,255,0.80)">{vl}</Badge>
        <HeroVal>{`Bs. ${fmt(calc.bolsillo)}`}</HeroVal>
        <HeroSub>/ mes neto en bolsillo — {MESES[mes-1]} {anio}</HeroSub>
        <HeroGrid items={[
          { label:"Anual",      value:`Bs. ${fmtK(calc.bolsillo*12)}` },
          { label:"Por pedido", value:`Bs. ${fmt(calc.porPedido)}`     },
          { label:"Margen neto",value:`${fmt(calc.margen)}%`           },
        ]} />
      </Hero>

      {/* Guardar */}
      <div style={{ background:T.green50, border:`1px solid ${T.green100}`, borderRadius:14, padding:"13px 14px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.green }}>💾 Guardar en historial</div>
          <div style={{ fontSize:11, color:T.g400, marginTop:2 }}>{MESES[mes-1]} {anio} — listo para archivar</div>
        </div>
        <button onClick={onGuardar} style={{ background:T.green, borderRadius:11, padding:"9px 16px", border:"none", cursor:"pointer", color:T.white, fontWeight:700, fontSize:13, flexShrink:0 }}>Guardar ›</button>
      </div>

      {/* Chips */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
        {[
          { label:"IT mensual",  value:`Bs. ${fmt(calc.it)}`,      col:T.red    },
          { label:"IVA mensual", value:`Bs. ${fmt(calc.ivaPagar)}`, col:T.blue   },
          { label:"IUE anual*",  value:`Bs. ${fmt(calc.iue)}`,     col:T.purple  },
        ].map((k,i) => (
          <div key={i} style={{ background:T.white, borderRadius:14, border:`1px solid ${k.col}22`, padding:"10px 10px 8px", borderBottom:`4px solid ${k.col}` }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:5 }}>{k.label}</div>
            <div style={{ fontSize:i===2?11:13, fontWeight:700, color:k.col }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Sec label="💵 Ingresos" />
      <Card p={0}>
        <div style={{ padding:"4px 16px 12px" }}>
          {calc.incT.filter(t=>t.total>0).map(t => <Row key={t.id} label={`${t.icon} ${t.label} (${fmt(t.qty)} ped.)`} value={`Bs. ${fmt(t.total)}`} col={TIER_COL[t.id]} sub />)}
          <Row label="Ingreso Bruto Mensual" value={`Bs. ${fmt(calc.ing)}`}      col={T.blue}  bold />
          <Row label="Ingreso Bruto Anual"   value={`Bs. ${fmt(calc.ing*12)}`}   col={T.blue}  last />
        </div>
      </Card>

      <Sec label="📅 IVA mensual" mt={6} />
      <Card p={0}>
        <div style={{ padding:"4px 16px 12px" }}>
          <Row label="IVA Débito (13%)"         value={`- Bs. ${fmt(calc.ivaDb)}`}      col={T.red}   />
          <Row label="  Crédito — compras"       value={`+ Bs. ${fmt(calc.ivaCredC)}`}   col={T.green} sub />
          <Row label="  Crédito — repartidores"  value={`+ Bs. ${fmt(calc.ivaCredDel)}`} col={T.green} sub />
          <Row label="IVA Crédito Total"         value={`Bs. ${fmt(calc.ivaCredT)}`}     col={T.green} bold />
          <div style={{ padding:"6px 0 10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.g400, marginBottom:4 }}>
              <span>Cobertura IVA con facturas</span>
              <span style={{ fontWeight:700, color:T.blue }}>{fmt(calc.cobIva)}%</span>
            </div>
            <Bar pct={calc.cobIva} col={T.blue} />
          </div>
          <Row label={calc.ivaFavor>0?"IVA a Favor ✅":"IVA a Pagar"} value={calc.ivaFavor>0?`Bs. ${fmt(calc.ivaFavor)} a favor`:`Bs. ${fmt(calc.ivaPagar)}`} col={calc.ivaFavor>0?T.green:T.red} bold last />
        </div>
      </Card>

      <Sec label="📅 IT mensual (3%)" mt={6} />
      <Card p={0}>
        <div style={{ padding:"4px 16px 12px" }}>
          <Row label="IT sobre ingresos brutos" value={`- Bs. ${fmt(calc.it)}`}       col={T.red} />
          <Row label="Total impuestos / mes"    value={`- Bs. ${fmt(calc.impTotal)}`} col={T.red} bold last />
        </div>
      </Card>

      <Sec label="🛵🚗 Pagos a repartidores" mt={6} />
      <Card p={0}>
        <div style={{ padding:"4px 16px 12px" }}>
          {calc.delT.filter(t=>t.total>0).map(t => <Row key={t.id} label={`${t.icon} ${t.label} ${t.fact?"✅":"❌"}`} value={`Bs. ${fmt(t.total)}`} col={t.fact?T.green:T.orange} sub />)}
          <Row label="Total pagos repartidores" value={`- Bs. ${fmt(calc.delTotal)}`} col={T.orange} bold last />
        </div>
      </Card>

      <Sec label="📆 IUE anual (25%)" mt={6} />
      <Card p={0}>
        <div style={{ padding:"12px 16px 4px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.g100}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.g700 }}>IUE Anual — Solo gastos CON factura deducibles</div>
          <Badge col={T.purple}>Vence abril</Badge>
        </div>
        <div style={{ padding:"4px 16px 12px" }}>
          <Row label="Ingreso Bruto Anual"        value={`Bs. ${fmt(calc.ing*12)}`}    />
          <Row label="  (−) Gastos deducibles ✅" value={`- Bs. ${fmt(calc.dedAnual)}`} col={T.green} sub />
          {calc.delSinF>0 && <Row label="  (✗) Sin factura — no deducible" value={`Bs. ${fmt(calc.delSinF*12)}`} col={T.red} sub />}
          <Row label="Utilidad Neta Anual"        value={`Bs. ${fmt(calc.utilidad)}`}  col={T.blue}   bold />
          <Row label="IUE a Pagar (25%)"          value={`Bs. ${fmt(calc.iue)}`}       col={T.purple} bold last />
        </div>
      </Card>

      {/* Ahorro IUE */}
      <div style={{ background:T.blue50, borderRadius:16, border:`1px solid ${T.blue100}`, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.blue, marginBottom:12 }}>💾 Plan de Ahorro para el IUE</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <StatBox label="Guardar / mes"   value={`Bs. ${fmt(calc.ahorro)}`} col={T.blue}   />
          <StatBox label="IUE total abril" value={`Bs. ${fmt(calc.iue)}`}    col={T.purple} />
        </div>
        <div style={{ fontSize:12, color:T.g500, lineHeight:1.65, background:T.white, borderRadius:10, padding:"10px 12px" }}>
          🔄 <strong style={{ color:T.green }}>Beneficio:</strong> Tras pagar IUE en abril, ese monto compensa ~{calc.mesesSinIT} meses de IT (Bs. {fmt(calc.it)}/mes).
        </div>
      </div>

      {/* Legal */}
      <div style={{ background:T.g50, borderRadius:14, border:`1px solid ${T.g200}`, padding:"13px 16px", marginBottom:8, fontSize:11, color:T.g400, lineHeight:2 }}>
        <div style={{ fontWeight:700, color:T.g500, marginBottom:4 }}>⚠️ Notas Legales</div>
        <div>• Delivery sin factura NO es deducible del IUE (DS 24051).</div>
        <div>• Repartidor sin NIT: retenele IUE (6.25%) + IT (3%) antes del día 10.</div>
        <div>• IUE vence ~29 de abril cada año.</div>
        <div>• Consultá con un contador habilitado ante Impuestos Nacionales.</div>
      </div>
    </Screen>
  );
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
function Historial({ historial, onEliminar, onCargar }) {
  const [open, setOpen] = useState(null);
  if (!historial.length) return (
    <Screen>
      <div style={{ textAlign:"center", padding:"40px 0" }}>
        <div style={{ fontSize:52, marginBottom:14 }}>📅</div>
        <div style={{ color:T.g400, fontSize:14, lineHeight:1.7 }}>Aún no hay meses guardados.<br/>Guardá desde la tab <strong style={{ color:T.green }}>Resultados</strong>.</div>
      </div>
    </Screen>
  );

  const totalIng  = historial.reduce((s,m)=>s+m.ing,0);
  const totalBols = historial.reduce((s,m)=>s+m.bolsillo,0);
  const totalImp  = historial.reduce((s,m)=>s+m.impTotal,0);
  const mejor = historial.reduce((b,m)=>m.bolsillo>(b?.bolsillo||-Infinity)?m:b, null);
  const u6    = historial.slice(-6);

  return (
    <Screen>
      {/* Hero acumulado */}
      <Hero>
        <HeroLabel>{historial.length} {historial.length===1?"mes guardado":"meses guardados"}</HeroLabel>
        <HeroVal>{`Bs. ${fmt(totalBols)}`}</HeroVal>
        <HeroSub>bolsillo acumulado total</HeroSub>
        <HeroGrid items={[
          { label:"Ingresos acum.",  value:`Bs. ${fmtK(totalIng)}`  },
          { label:"Impuestos acum.", value:`Bs. ${fmtK(totalImp)}`  },
        ]} />
        {mejor && (
          <div style={{ marginTop:12, background:"rgba(255,255,255,0.10)", borderRadius:10, padding:"8px 12px", fontSize:11, color:"rgba(255,255,255,0.75)" }}>
            🏆 Mejor mes: <strong style={{ color:T.white }}>{MESES[mejor.mes-1]} {mejor.anio}</strong> — Bs. {fmt(mejor.bolsillo)}
          </div>
        )}
      </Hero>

      {/* Gráficos */}
      {historial.length >= 2 && (
        <>
          <Sec label="Evolución (últimos 6 meses)" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <Card style={{ marginBottom:0 }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:8 }}>Ingresos</div>
              <Bars data={u6.map(m=>({ l:mesCorto(m.mes), v:m.ing }))} col={T.blue} />
            </Card>
            <Card style={{ marginBottom:0 }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:8 }}>Bolsillo</div>
              <Bars data={u6.map(m=>({ l:mesCorto(m.mes), v:Math.max(0,m.bolsillo) }))} col={T.green} />
            </Card>
          </div>
        </>
      )}

      <Sec label="Detalle por mes" />
      {[...historial].reverse().map(m => {
        const vc  = m.bolsillo<0?T.red:m.margen<10?T.amber:T.green;
        const key = m.key;
        const isOpen = open===key;
        return (
          <div key={key} style={{ background:T.white, borderRadius:16, border:`1px solid ${T.g200}`, marginBottom:10, overflow:"hidden" }}>
            <div onClick={()=>setOpen(isOpen?null:key)} style={{ padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:`${vc}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
                  {m.bolsillo<0?"🚨":m.margen<10?"⚠️":"✅"}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.g900 }}>{MESES[m.mes-1]} {m.anio}</div>
                  <div style={{ fontSize:11, color:T.g400 }}>{m.pedidos} pedidos · {fmt(m.margen)}% margen</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:15, fontWeight:700, color:vc }}>Bs. {fmt(m.bolsillo)}</div>
                <div style={{ fontSize:10, color:T.g400 }}>bolsillo</div>
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop:`1px solid ${T.g100}` }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderBottom:`1px solid ${T.g100}` }}>
                  {[
                    { l:"Ingresos",      v:`Bs. ${fmt(m.ing)}`,      c:T.blue   },
                    { l:"Impuestos",     v:`Bs. ${fmt(m.impTotal)}`,  c:T.red    },
                    { l:"Repartidores",  v:`Bs. ${fmt(m.delTotal)}`,  c:T.orange },
                  ].map((k,j) => (
                    <div key={j} style={{ padding:"10px 14px", borderRight:j<2?`1px solid ${T.g100}`:"none" }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:4 }}>{k.l}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:k.c }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderBottom:`1px solid ${T.g100}` }}>
                  {[
                    { l:"IT",   v:`Bs. ${fmt(m.it)}`,       c:T.red    },
                    { l:"IVA",  v:`Bs. ${fmt(m.ivaPagar)}`,  c:T.blue   },
                    { l:"IUE*", v:`Bs. ${fmt(m.iue)}`,       c:T.purple },
                  ].map((k,j) => (
                    <div key={j} style={{ padding:"10px 14px", borderRight:j<2?`1px solid ${T.g100}`:"none" }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:T.g400, marginBottom:4 }}>{k.l}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:k.c }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"10px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <button onClick={()=>onCargar(m)} style={{ background:T.blue50, border:`1px solid ${T.blue}33`, borderRadius:10, padding:"9px 0", cursor:"pointer", color:T.blue, fontWeight:700, fontSize:12 }}>📂 Cargar datos</button>
                  <button onClick={()=>{ if(window.confirm(`¿Eliminar ${MESES[m.mes-1]} ${m.anio}?`)) onEliminar(key); }} style={{ background:T.red50, border:`1px solid ${T.red}33`, borderRadius:10, padding:"9px 0", cursor:"pointer", color:T.red, fontWeight:700, fontSize:12 }}>🗑 Eliminar</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Screen>
  );
}

// ── SIMULADOR ────────────────────────────────────────────────────────────────
function Simulador({ calc }) {
  const [deltaPrecio,  setDeltaPrecio]  = useState(0);
  const [deltaPedidos, setDeltaPedidos] = useState(0);
  const [deltaFacturas,setDeltaFacturas]= useState(0);

  const sim = useMemo(() => {
    if (!calc.ing) return null;
    const newIng    = calc.ing + (calc.pedidos * deltaPrecio) + (deltaPedidos * (calc.pedidos>0 ? calc.ing/calc.pedidos : 0));
    const newCredF  = calc.ivaCredC + (deltaFacturas * 0.13);
    const newIvaDb  = newIng * 0.13;
    const newIvaT   = newCredF + calc.ivaCredDel;
    const newIvaPag = Math.max(0, newIvaDb - newIvaT);
    const newIT     = newIng * 0.03;
    const newImp    = newIT + newIvaPag;
    const newBols   = newIng - newImp - calc.delTotal;
    const diffBols  = newBols - calc.bolsillo;
    const newMargen = newIng > 0 ? (newBols/newIng)*100 : 0;
    return { newIng, newBols, diffBols, newMargen, newIT, newIvaPag };
  }, [calc, deltaPrecio, deltaPedidos, deltaFacturas]);

  if (!calc.ing) return (
    <Screen>
      <div style={{ textAlign:"center", padding:"40px 0" }}>
        <div style={{ fontSize:52, marginBottom:14 }}>🔮</div>
        <div style={{ color:T.g400, fontSize:14, lineHeight:1.7 }}>Ingresá tus datos en <strong style={{ color:T.blue }}>Ingresos</strong> primero.</div>
      </div>
    </Screen>
  );

  const diffCol = !sim ? T.g400 : sim.diffBols > 0 ? T.green : sim.diffBols < 0 ? T.red : T.g400;

  return (
    <Screen>
      <Hero>
        <HeroLabel>Simulador — ¿Qué pasa si...?</HeroLabel>
        <HeroVal>{sim ? `Bs. ${fmt(sim.newBols)}` : `Bs. ${fmt(calc.bolsillo)}`}</HeroVal>
        <HeroSub>bolsillo proyectado</HeroSub>
        {sim && sim.diffBols !== 0 && (
          <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.13)", borderRadius:99, padding:"5px 12px", fontSize:12, fontWeight:700, color:T.white }}>
            {sim.diffBols > 0 ? "▲" : "▼"} Bs. {fmt(Math.abs(sim.diffBols))} vs. actual
          </div>
        )}
      </Hero>

      <Sec label="Ajustá los parámetros" />

      {/* Slider precio por pedido */}
      <Card style={{ marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.g700 }}>💵 Precio por pedido</div>
          <div style={{ fontSize:13, fontWeight:700, color:deltaPrecio>=0?T.green:T.red }}>
            {deltaPrecio>=0?"+":""}{deltaPrecio} Bs.
          </div>
        </div>
        <input type="range" min={-20} max={50} step={1} value={deltaPrecio} onChange={e=>setDeltaPrecio(Number(e.target.value))}
          style={{ width:"100%", accentColor:T.blue }} />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.g400, marginTop:4 }}>
          <span>-20 Bs.</span><span>0</span><span>+50 Bs.</span>
        </div>
      </Card>

      {/* Slider pedidos */}
      <Card style={{ marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.g700 }}>📦 Pedidos adicionales / mes</div>
          <div style={{ fontSize:13, fontWeight:700, color:deltaPedidos>=0?T.green:T.red }}>
            {deltaPedidos>=0?"+":""}{deltaPedidos} ped.
          </div>
        </div>
        <input type="range" min={-50} max={200} step={5} value={deltaPedidos} onChange={e=>setDeltaPedidos(Number(e.target.value))}
          style={{ width:"100%", accentColor:T.blue }} />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.g400, marginTop:4 }}>
          <span>-50</span><span>0</span><span>+200</span>
        </div>
      </Card>

      {/* Slider facturas */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.g700 }}>🧾 Facturas adicionales / mes</div>
          <div style={{ fontSize:13, fontWeight:700, color:T.green }}>
            +Bs. {fmt(deltaFacturas)}
          </div>
        </div>
        <input type="range" min={0} max={5000} step={100} value={deltaFacturas} onChange={e=>setDeltaFacturas(Number(e.target.value))}
          style={{ width:"100%", accentColor:T.green }} />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.g400, marginTop:4 }}>
          <span>Bs. 0</span><span>Bs. 5,000</span>
        </div>
      </Card>

      {/* Resultado */}
      {sim && (
        <>
          <Sec label="Resultado proyectado" />
          <Card p={0}>
            <div style={{ padding:"4px 16px 12px" }}>
              <Row label="Ingreso proyectado"   value={`Bs. ${fmt(sim.newIng)}`}    col={T.blue}  />
              <Row label="IT proyectado"        value={`- Bs. ${fmt(sim.newIT)}`}   col={T.red}   />
              <Row label="IVA proyectado"       value={`- Bs. ${fmt(sim.newIvaPag)}`}col={T.red}  />
              <Row label="Bolsillo proyectado"  value={`Bs. ${fmt(sim.newBols)}`}   col={diffCol} bold />
              <Row label="Diferencia vs. actual" value={`${sim.diffBols>=0?"+":""}Bs. ${fmt(sim.diffBols)}`} col={diffCol} bold last />
            </div>
          </Card>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
            <StatBox label="Margen proyectado" value={`${fmt(sim.newMargen)}%`} col={diffCol} />
            <StatBox label="Mejora bolsillo"   value={`${sim.diffBols>=0?"+":""}Bs. ${fmt(sim.diffBols)}`} col={diffCol} />
          </div>
        </>
      )}

      <button onClick={()=>{ setDeltaPrecio(0); setDeltaPedidos(0); setDeltaFacturas(0); }}
        style={{ marginTop:16, background:"none", border:`1px solid ${T.g200}`, borderRadius:12, padding:"10px 0", width:"100%", cursor:"pointer", color:T.g400, fontSize:13 }}>
        Resetear simulación
      </button>
    </Screen>
  );
}

// ── ALERTAS ───────────────────────────────────────────────────────────────────
function Alertas({ calc, mes, anio }) {
  const hoy   = new Date();
  const dia   = hoy.getDate();
  const mesH  = hoy.getMonth()+1;
  const anioH = hoy.getFullYear();

  const diasParaDia10 = (() => {
    const d = new Date(anioH, mesH-1, 10);
    if (d <= hoy) d.setMonth(d.getMonth()+1);
    return Math.ceil((d-hoy)/86400000);
  })();
  const diasParaAbril = (() => {
    let y = anioH; if (mesH > 4) y++;
    const d = new Date(y, 3, 29);
    return Math.ceil((d-hoy)/86400000);
  })();

  const alertas = [
    {
      activa: diasParaDia10 <= 10,
      urgente: diasParaDia10 <= 3,
      icon: "📋", col: T.amber,
      titulo: "Empozamiento IT — Formulario 400",
      desc: `Debés empozar el IT (Bs. ${calc.ing>0?fmt(calc.it):"—"}) antes del día 10 de cada mes.`,
      dias: `Faltan ${diasParaDia10} días (${diasParaDia10<=0?"HOY":"día 10 de "+MESES[mesH-1<11?mesH:0]})`,
    },
    {
      activa: diasParaAbril <= 60,
      urgente: diasParaAbril <= 15,
      icon: "📆", col: T.purple,
      titulo: "Vencimiento IUE — Abril",
      desc: `El IUE anual vence el 29 de abril. Monto estimado: Bs. ${calc.ing>0?fmt(calc.iue):"—"}.`,
      dias: `Faltan ${diasParaAbril} días`,
    },
    {
      activa: true,
      urgente: false,
      icon: "💾", col: T.blue,
      titulo: "Ahorro mensual para IUE",
      desc: `Para no sufrir en abril, guardá Bs. ${calc.ing>0?fmt(calc.ahorro):"—"} cada mes.`,
      dias: `Meta mensual`,
    },
    {
      activa: calc.delSinF > 0,
      urgente: calc.delSinF > 2000,
      icon: "🧾", col: T.red,
      titulo: "Repartidores sin factura",
      desc: `Tenés Bs. ${fmt(calc.delSinF)}/mes en pagos sin nota fiscal. No son deducibles del IUE.`,
      dias: `Bs. ${fmt(calc.delSinF*12)}/año no deducible`,
    },
    {
      activa: calc.ivaFavor > 0,
      urgente: false,
      icon: "✅", col: T.green,
      titulo: "IVA a tu favor este mes",
      desc: `Tenés Bs. ${fmt(calc.ivaFavor)} de crédito IVA que se traslada al mes siguiente.`,
      dias: `Acumulado para el próximo mes`,
    },
  ].filter(a => a.activa);

  return (
    <Screen>
      <Hero>
        <HeroLabel>Centro de alertas</HeroLabel>
        <HeroVal sm>{alertas.length} alerta{alertas.length!==1?"s":""} activa{alertas.length!==1?"s":""}</HeroVal>
        <HeroSub>{MESES[mes-1]} {anio} · día {dia}</HeroSub>
      </Hero>

      <Sec label="Alertas y recordatorios" />
      {alertas.length === 0 && (
        <div style={{ textAlign:"center", padding:"30px 0", color:T.g400, fontSize:14 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
          Todo en orden por ahora.
        </div>
      )}
      {alertas.map((a,i) => (
        <div key={i} style={{ background:T.white, borderRadius:16, border:`1.5px solid ${a.urgente?a.col+"88":a.col+"33"}`, borderLeft:`4px solid ${a.col}`, marginBottom:12, padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:`${a.col}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0 }}>{a.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.g900 }}>{a.titulo}</div>
                {a.urgente && <Badge col={T.red}>Urgente</Badge>}
              </div>
              <div style={{ fontSize:12, color:T.g500, lineHeight:1.6, marginBottom:6 }}>{a.desc}</div>
              <div style={{ fontSize:11, fontWeight:700, color:a.col }}>{a.dias}</div>
            </div>
          </div>
        </div>
      ))}

      <Sec label="Calendario fiscal Bolivia" mt={6} />
      <Card p={0}>
        {[
          { fecha:"Día 10 c/mes", accion:"Empozar IT — Formulario 400", col:T.amber   },
          { fecha:"Día 20 c/mes", accion:"Presentar IVA — Formulario 200", col:T.blue },
          { fecha:"29 de abril",  accion:"Pago anual IUE — Formulario 500", col:T.purple },
          { fecha:"Cuando aplique",accion:"RC-IVA dependientes — Form. 110", col:T.cyan },
        ].map((r,i,arr) => (
          <div key={i} style={{ padding:"11px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:i<arr.length-1?`1px solid ${T.g100}`:"none" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:r.col, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.g900 }}>{r.fecha}</div>
              <div style={{ fontSize:11, color:T.g400, marginTop:1 }}>{r.accion}</div>
            </div>
          </div>
        ))}
      </Card>
    </Screen>
  );
}

// ── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,   setScreen]   = useState("splash");
  const [tab,      setTab]      = useState("inicio");
  const [income,   setIncome]   = useState(initInc());
  const [delivery, setDelivery] = useState(initDel());
  const [facturas, setFacturas] = useState("");
  const [historial,setHistorial]= useState([]);
  const now = new Date();
  const [mes,  setMes]  = useState(now.getMonth()+1);
  const [anio, setAnio] = useState(now.getFullYear());

  const setInc = (id,f,v) => setIncome(p    => ({ ...p, [id]:{ ...p[id],[f]:v } }));
  const setDel = (id,f,v) => setDelivery(p  => ({ ...p, [id]:{ ...p[id],[f]:v } }));

  const calc = useMemo(() => engine(income, delivery, facturas), [income, delivery, facturas]);

  const guardar = () => {
    if (!calc.ing) return;
    const key = `${anio}-${mes}`;
    setHistorial(prev => {
      const sin = prev.filter(m => m.key !== key);
      return [...sin, { key, mes, anio, ing:calc.ing, bolsillo:calc.bolsillo, impTotal:calc.impTotal, delTotal:calc.delTotal, margen:calc.margen, pedidos:calc.pedidos, it:calc.it, ivaPagar:calc.ivaPagar, iue:calc.iue, _inc:JSON.parse(JSON.stringify(income)), _del:JSON.parse(JSON.stringify(delivery)), _fac:facturas }].sort((a,b)=>a.anio!==b.anio?a.anio-b.anio:a.mes-b.mes);
    });
    alert(`✅ ${MESES[mes-1]} ${anio} guardado`);
  };

  const cargar = m => { setIncome(m._inc); setDelivery(m._del); setFacturas(m._fac); setMes(m.mes); setAnio(m.anio); setTab("ingresos"); };
  const eliminar = key => setHistorial(prev => prev.filter(m => m.key !== key));

  if (screen === "splash") return <Splash onStart={()=>setScreen("app")} />;

  const TABS = [
    { id:"inicio",       icon:"🏠", label:"Inicio"        },
    { id:"ingresos",     icon:"💵", label:"Ingresos"      },
    { id:"repartidores", icon:"🛵", label:"Repartidores"  },
    { id:"resultados",   icon:"📊", label:"Resultados"    },
    { id:"historial",    icon:"📅", label:"Historial",    badge:historial.length||null },
    { id:"simulador",    icon:"🔮", label:"Simulador"     },
    { id:"alertas",      icon:"🔔", label:"Alertas"       },
  ];

  return (
    <div style={{ height:"100vh", background:T.bg, maxWidth:430, margin:"0 auto", fontFamily:"'Inter','Segoe UI',sans-serif", color:T.g900, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* HEADER */}
      <div style={{ background:T.blue, padding:"44px 16px 14px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-30, top:-30, width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:"rgba(255,255,255,0.50)", marginBottom:3 }}>🇧🇴 Bolivia · Régimen General</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.white }}>Calculadora <span style={{ opacity:0.60 }}>Fiscal</span></div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <select value={mes} onChange={e=>setMes(Number(e.target.value))}
              style={{ background:"rgba(255,255,255,0.14)", border:"none", borderRadius:8, padding:"5px 8px", color:T.white, fontSize:11, fontWeight:700, outline:"none", cursor:"pointer" }}>
              {MESES.map((m,i)=><option key={i} value={i+1} style={{ color:T.g900, background:T.white }}>{m.slice(0,3)}</option>)}
            </select>
            <select value={anio} onChange={e=>setAnio(Number(e.target.value))}
              style={{ background:"rgba(255,255,255,0.14)", border:"none", borderRadius:8, padding:"5px 8px", color:T.white, fontSize:11, fontWeight:700, outline:"none", cursor:"pointer" }}>
              {[2023,2024,2025,2026,2027].map(y=><option key={y} value={y} style={{ color:T.g900, background:T.white }}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TAB BAR — scroll horizontal */}
      <div style={{ background:T.white, borderBottom:`1px solid ${T.g200}`, overflowX:"auto", display:"flex", position:"sticky", top:0, zIndex:50, scrollbarWidth:"none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flexShrink:0, background:"none", border:"none", cursor:"pointer", padding:"8px 12px 6px", fontSize:10, fontWeight:tab===t.id?700:500, color:tab===t.id?T.blue:T.g400, borderBottom:`2.5px solid ${tab===t.id?T.blue:"transparent"}`, transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:2, position:"relative", minWidth:60 }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>
            <span style={{ whiteSpace:"nowrap" }}>{t.label}</span>
            {t.badge && <span style={{ position:"absolute", top:4, right:8, background:T.green, color:T.white, borderRadius:99, fontSize:8, fontWeight:800, padding:"1px 4px" }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:"auto", minHeight:0 }}>
        {tab==="inicio"       && <Dashboard     calc={calc} mes={mes} anio={anio} historial={historial} onNav={setTab} />}
        {tab==="ingresos"     && <Ingresos      income={income} setInc={setInc} facturas={facturas} setFacturas={setFacturas} calc={calc} onNext={()=>setTab("repartidores")} />}
        {tab==="repartidores" && <Repartidores  delivery={delivery} setDel={setDel} calc={calc} onNext={()=>setTab("resultados")} />}
        {tab==="resultados"   && <Resultados    calc={calc} mes={mes} anio={anio} onGuardar={guardar} />}
        {tab==="historial"    && <Historial     historial={historial} onEliminar={eliminar} onCargar={cargar} />}
        {tab==="simulador"    && <Simulador     calc={calc} />}
        {tab==="alertas"      && <Alertas       calc={calc} mes={mes} anio={anio} />}
      </div>
    </div>
  );
}
