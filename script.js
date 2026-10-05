// Archivo CSV a consultar (debe estar en la misma carpeta que index.html)
const ARCHIVO_CSV = "Becas.csv";

const cuerpo = document.getElementById("cuerpo");
const buscar = document.getElementById("buscar");
//const contador = document.getElementById("contador");
const mensaje = document.getElementById("mensaje");

let grupos = []; // [{ id, principal, historial: [] }]

/* ---------- CSV ---------- */
// Lector de CSV que respeta comillas, comas y saltos de línea dentro de campos.
function parseCSV(texto) {
  texto = texto.replace(/^\uFEFF/, "");
  const filas = [];
  let fila = [],
    campo = "",
    comillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      campo = "";
      if (fila.some((v) => v.trim() !== "")) filas.push(fila);
      fila = [];
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((v) => v.trim() !== "")) filas.push(fila);
  return filas;
}

function aObjetos(filas) {
  const cols = [
    "numero",
    "id",
    "nombre",
    "tipobeca",
    "estado",
    "fechacreacionbd",
    "fechabd",
    "observacion",
  ];
  // Si la primera fila es un encabezado (numero no es un número), se descarta.
  if (filas.length && isNaN(parseInt(filas[0][0], 10))) filas = filas.slice(1);
  return filas.map((f) => {
    const o = {};
    cols.forEach((c, i) => (o[c] = (f[i] ?? "").trim()));
    o.numero = parseInt(o.numero, 10);
    return o;
  });
}

function agrupar(registros) {
  const mapa = new Map();
  registros.forEach((r) => {
    if (!mapa.has(r.id)) mapa.set(r.id, []);
    mapa.get(r.id).push(r);
  });
  return [...mapa.entries()].map(([id, lista]) => {
    lista.sort((a, b) => a.numero - b.numero);
    const principal = lista.find((r) => r.numero === 1) || lista[0];
    const historial = lista.filter((r) => r !== principal);
    return { id, principal, historial };
  });
}

/* ---------- Pintar tabla ---------- */
function esc(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

function badge(estado) {
  const clase = estado
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");
  const conocidos = [
    "pendiente",
    "observado",
    "aprobado",
    "aceptado",
    "adjudicado",
  ];
  return `<span class="badge ${conocidos.includes(clase) ? clase : "otro"}">${esc(estado)}</span>`;
}

function pintar(lista) {
  cuerpo.innerHTML = "";
  lista.forEach((g) => {
    const p = g.principal;
    const tr = document.createElement("tr");
    tr.className = "principal";
    tr.innerHTML = `
      <td>${
        g.historial.length
          ? `<button class="toggle" aria-expanded="false">${esc(p.id)}</button>`
          : esc(p.id)
      }</td>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.fechacreacionbd)}</td>
      `;
    cuerpo.appendChild(tr);

    /*
    <td>${esc(p.tipobeca)}</td>
      <td>${badge(p.estado)}</td>
      <td>${esc(p.fechabd)}</td>
    */

    if (!g.historial.length) return;

    const hist = document.createElement("tr");
    hist.className = "hist";
    hist.hidden = true;
    hist.innerHTML = `<td colspan="6">
      <table>
        <thead><tr><th>N.º</th><th>Estado</th><th>Fecha</th><th>Observación</th></tr></thead>
        <tbody>${g.historial
          .map(
            (r) => `
          <tr>
            <td>${r.numero}</td>
            <td>${badge(r.estado)}</td>
            <td>${esc(r.fechabd)}</td>
            <td class="obs">${esc(r.observacion) || "—"}</td>
          </tr>`,
          )
          .join("")}
        </tbody>
      </table></td>`;
    cuerpo.appendChild(hist);

    const alternar = () => {
      const abierto = hist.hidden;
      hist.hidden = !abierto;
      tr.classList.toggle("abierto", abierto);
      tr.querySelector(".toggle").setAttribute("aria-expanded", abierto);
    };
    tr.addEventListener("click", alternar);
  });

  //contador.textContent = `${lista.length} de ${grupos.length} becas`;
  mensaje.hidden = lista.length > 0;
  if (!lista.length)
    mensaje.textContent = "No hay resultados. Prueba con otro nombre o ID.";
}

/* ---------- Búsqueda ---------- */
function normalizar(t) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

buscar.addEventListener("input", () => {
  const q = normalizar(buscar.value.trim());
  pintar(
    grupos.filter(
      (g) => normalizar(g.principal.nombre).includes(q) || g.id.includes(q),
    ),
  );
});

/* ---------- Inicio ---------- */
fetch(ARCHIVO_CSV)
  .then((r) => {
    if (!r.ok) throw new Error("No se encontró " + ARCHIVO_CSV);
    return r.text();
  })
  .then((texto) => {
    grupos = agrupar(aObjetos(parseCSV(texto)));
    pintar(grupos);
  })
  .catch((err) => {
    mensaje.hidden = false;
    mensaje.textContent =
      "No se pudo cargar el archivo de becas. (" + err.message + ")";
  });
