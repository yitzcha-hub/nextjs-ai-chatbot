import { auth } from "@/app/(auth)/auth";
import {
  addDocumentCollaborator,
  getDocumentById,
  getDocumentCollaborators,
  getUser,
  removeDocumentCollaborator,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter documentId is required"
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const document = await getDocumentById({ id: documentId });

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  // Only the owner can list collaborators
  if (document.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  const collaborators = await getDocumentCollaborators({ documentId });

  return Response.json(collaborators, { status: 200 });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const {
    documentId,
    email,
  }: { documentId: string; email: string } = await request.json();

  if (!documentId || !email) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters documentId and email are required"
    ).toResponse();
  }

  const document = await getDocumentById({ id: documentId });

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  // Only the owner can add collaborators
  if (document.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  // Find the user by email
  const [collaboratorUser] = await getUser(email);

  if (!collaboratorUser) {
    return new ChatSDKError(
      "not_found:user",
      "User with this email not found"
    ).toResponse();
  }

  // Cannot add owner as collaborator
  if (collaboratorUser.id === session.user.id) {
    return new ChatSDKError(
      "bad_request:api",
      "Cannot add yourself as a collaborator"
    ).toResponse();
  }

  await addDocumentCollaborator({
    documentId,
    userId: collaboratorUser.id,
  });

  return Response.json(
    { message: "Collaborator added successfully" },
    { status: 200 }
  );
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const {
    documentId,
    userId,
  }: { documentId: string; userId: string } = await request.json();

  if (!documentId || !userId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters documentId and userId are required"
    ).toResponse();
  }

  const document = await getDocumentById({ id: documentId });

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  // Only the owner can remove collaborators
  if (document.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  await removeDocumentCollaborator({ documentId, userId });

  return Response.json(
    { message: "Collaborator removed successfully" },
    { status: 200 }
  );
}
