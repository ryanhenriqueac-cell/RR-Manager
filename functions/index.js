const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const ADMIN_EMAILS = new Set(["admin@rrreparacao.com.br"]);

exports.deleteCustomerAccount = onCall({ region: "southamerica-east1" }, async (request) => {
  const requesterEmail = String(request.auth?.token?.email || "").trim().toLowerCase();
  if (!request.auth || !ADMIN_EMAILS.has(requesterEmail)) {
    throw new HttpsError("permission-denied", "Somente o administrador pode excluir contas.");
  }

  const workspaceId = String(request.data?.workspaceId || "").trim();
  const expectedEmail = String(request.data?.email || "").trim().toLowerCase();
  if (!workspaceId || workspaceId === request.auth.uid) {
    throw new HttpsError("invalid-argument", "Conta inválida para exclusão.");
  }

  const auth = getAuth();
  const db = getFirestore();
  let customer;
  try {
    customer = await auth.getUser(workspaceId);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  const customerEmail = String(customer?.email || "").trim().toLowerCase();
  if (customer && expectedEmail && customerEmail !== expectedEmail) {
    throw new HttpsError("failed-precondition", "O e-mail não corresponde ao usuário selecionado.");
  }

  if (customer) await auth.updateUser(workspaceId, { disabled: true });

  const workspaceRef = db.doc(`workspaces/${workspaceId}`);
  await db.recursiveDelete(workspaceRef);

  const [linksByUid, linksByOwner] = await Promise.all([
    db.collection("public_orcamentos").where("ownerUid", "==", workspaceId).get(),
    db.collection("public_orcamentos").where("owner", "==", workspaceId).get()
  ]);
  const publicLinks = new Map();
  [...linksByUid.docs, ...linksByOwner.docs].forEach((record) => publicLinks.set(record.ref.path, record.ref));
  if (publicLinks.size) {
    const writer = db.bulkWriter();
    publicLinks.forEach((recordRef) => writer.delete(recordRef));
    await writer.close();
  }

  if (customer) await auth.deleteUser(workspaceId);

  console.log("Conta de cliente excluída", { workspaceId, email: customerEmail || expectedEmail, deletedBy: requesterEmail });
  return { success: true, authUserDeleted: Boolean(customer) };
});
