import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  doc,
  getDoc,
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const config = window.firebaseConfig || {};
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (id && config.apiKey && config.projectId) {
  const app = initializeApp(config);
  const db = getFirestore(app);

  getDoc(doc(db, "public_orcamentos", id))
    .then((snap) => {
      if (!snap.exists()) throw new Error("Orçamento não encontrado.");
      window.rrPendingPublicOrcamentoData = snap.data().data;
      window.renderPublicOrcamentoData?.(snap.data().data);
      window.dispatchEvent(new CustomEvent("rr-public-orcamento-loaded", { detail: snap.data().data }));
    })
    .catch(() => {
      window.showPublicOrcamentoError?.("Orçamento indisponível. Confira se o link recebido está correto.");
    });
}
