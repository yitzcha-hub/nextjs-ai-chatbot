import type { Document } from "@/lib/db/schema";
import { getMessageByErrorCode } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";
import { expect, test } from "../fixtures";

const documentsCreatedByAda: Document[] = [];
let babbageUserId: string;

test.describe
  .serial("/api/document/collaborators", () => {
    test("Ada creates a document", async ({ adaContext }) => {
      const documentId = generateUUID();

      const draftDocument = {
        title: "Ada's Collaborative Document",
        kind: "text",
        content: "Created by Ada for collaboration",
      };

      const response = await adaContext.request.post(
        `/api/document?id=${documentId}`,
        {
          data: draftDocument,
        }
      );
      expect(response.status()).toBe(200);

      const [createdDocument] = await response.json();
      expect(createdDocument).toMatchObject(draftDocument);

      documentsCreatedByAda.push(createdDocument);
    });

    test("Ada can retrieve collaborators list (initially empty)", async ({
      adaContext,
    }) => {
      const [document] = documentsCreatedByAda;

      const response = await adaContext.request.get(
        `/api/document/collaborators?documentId=${document.id}`
      );
      expect(response.status()).toBe(200);

      const collaborators = await response.json();
      expect(collaborators).toHaveLength(0);
    });

    test("Babbage cannot retrieve Ada's collaborators list", async ({
      babbageContext,
    }) => {
      const [document] = documentsCreatedByAda;

      const response = await babbageContext.request.get(
        `/api/document/collaborators?documentId=${document.id}`
      );
      expect(response.status()).toBe(403);

      const { code, message } = await response.json();
      expect(code).toEqual("forbidden:document");
      expect(message).toEqual(getMessageByErrorCode(code));
    });

    test("Ada cannot add a non-existent user as collaborator", async ({
      adaContext,
    }) => {
      const [document] = documentsCreatedByAda;

      const response = await adaContext.request.post(
        "/api/document/collaborators",
        {
          data: {
            documentId: document.id,
            email: "nonexistent@example.com",
          },
        }
      );
      expect(response.status()).toBe(404);

      const { code } = await response.json();
      expect(code).toEqual("not_found:user");
    });

    test("Ada can add Babbage as a collaborator", async ({
      adaContext,
      babbageContext,
    }) => {
      const [document] = documentsCreatedByAda;
      const babbageUser = babbageContext.user;

      const response = await adaContext.request.post(
        "/api/document/collaborators",
        {
          data: {
            documentId: document.id,
            email: babbageUser.email,
          },
        }
      );
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe("Collaborator added successfully");
    });

    test("Ada can see Babbage in the collaborators list", async ({
      adaContext,
      babbageContext,
    }) => {
      const [document] = documentsCreatedByAda;
      const babbageUser = babbageContext.user;

      const response = await adaContext.request.get(
        `/api/document/collaborators?documentId=${document.id}`
      );
      expect(response.status()).toBe(200);

      const collaborators = await response.json();
      expect(collaborators).toHaveLength(1);
      expect(collaborators[0].email).toBe(babbageUser.email);

      // Store the userId for later tests
      babbageUserId = collaborators[0].userId;
    });

    test("Babbage can now retrieve Ada's document", async ({
      babbageContext,
    }) => {
      const [document] = documentsCreatedByAda;

      const response = await babbageContext.request.get(
        `/api/document?id=${document.id}`
      );
      expect(response.status()).toBe(200);

      const retrievedDocuments = await response.json();
      expect(retrievedDocuments).toHaveLength(1);
      expect(retrievedDocuments[0]).toMatchObject(document);
    });

    test("Babbage can update Ada's document as a collaborator", async ({
      babbageContext,
    }) => {
      const [document] = documentsCreatedByAda;

      const draftDocument = {
        title: "Ada's Collaborative Document",
        kind: "text",
        content: "Updated by Babbage as a collaborator",
      };

      const response = await babbageContext.request.post(
        `/api/document?id=${document.id}`,
        {
          data: draftDocument,
        }
      );
      expect(response.status()).toBe(200);

      const [updatedDocument] = await response.json();
      expect(updatedDocument.content).toBe(draftDocument.content);
    });

    test("Curie cannot access Ada's document (not a collaborator)", async ({
      curieContext,
    }) => {
      const [document] = documentsCreatedByAda;

      const response = await curieContext.request.get(
        `/api/document?id=${document.id}`
      );
      expect(response.status()).toBe(403);

      const { code, message } = await response.json();
      expect(code).toEqual("forbidden:document");
      expect(message).toEqual(getMessageByErrorCode(code));
    });

    test("Babbage cannot add collaborators to Ada's document", async ({
      babbageContext,
      curieContext,
    }) => {
      const [document] = documentsCreatedByAda;
      const curieUser = curieContext.user;

      const response = await babbageContext.request.post(
        "/api/document/collaborators",
        {
          data: {
            documentId: document.id,
            email: curieUser.email,
          },
        }
      );
      expect(response.status()).toBe(403);

      const { code, message } = await response.json();
      expect(code).toEqual("forbidden:document");
      expect(message).toEqual(getMessageByErrorCode(code));
    });

    test("Ada can remove Babbage as a collaborator", async ({ adaContext }) => {
      const [document] = documentsCreatedByAda;

      const response = await adaContext.request.delete(
        "/api/document/collaborators",
        {
          data: {
            documentId: document.id,
            userId: babbageUserId,
          },
        }
      );
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe("Collaborator removed successfully");
    });

    test("Babbage can no longer access Ada's document after removal", async ({
      babbageContext,
    }) => {
      const [document] = documentsCreatedByAda;

      const response = await babbageContext.request.get(
        `/api/document?id=${document.id}`
      );
      expect(response.status()).toBe(403);

      const { code, message } = await response.json();
      expect(code).toEqual("forbidden:document");
      expect(message).toEqual(getMessageByErrorCode(code));
    });

    test("Ada cannot add herself as a collaborator", async ({ adaContext }) => {
      const [document] = documentsCreatedByAda;
      const adaUser = adaContext.user;

      const response = await adaContext.request.post(
        "/api/document/collaborators",
        {
          data: {
            documentId: document.id,
            email: adaUser.email,
          },
        }
      );
      expect(response.status()).toBe(400);

      const { code } = await response.json();
      expect(code).toEqual("bad_request:api");
    });
  });
