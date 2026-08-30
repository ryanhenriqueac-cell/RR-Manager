import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  deleteField,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const config = window.firebaseConfig || {};
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (id && config.apiKey && config.projectId) {
  const app = initializeApp(config);
  const db = getFirestore(app);
  const publicRef = doc(db, "public_orcamentos", id);

  window.rrSubmitPublicOrcamentoResponse = async (response) => {
    if (!['approved', 'rejected'].includes(response)) throw new Error("Resposta inválida.");
    await updateDoc(publicRef, {
      clientResponse: response,
      clientRespondedAt: serverTimestamp()
    });
    return response;
  };

  window.rrClearPublicOrcamentoResponse = async () => {
    await updateDoc(publicRef, {
      clientResponse: deleteField(),
      clientRespondedAt: deleteField()
    });
  };

  getDoc(publicRef)
    .then((snap) => {
      if (!snap.exists()) throw new Error("Orçamento não encontrado.");
      const publicDocument = snap.data();
      window.rrPendingPublicOrcamentoData = publicDocument.data;
      window.renderPublicOrcamentoData?.(publicDocument.data);
      window.renderPublicOrcamentoResponse?.(publicDocument.clientResponse || "");
      window.dispatchEvent(new CustomEvent("rr-public-orcamento-loaded", { detail: publicDocument.data }));
    })
    .catch(() => {
      window.showPublicOrcamentoError?.("Orçamento indisponível. Confira se o link recebido está correto.");
    });
}
