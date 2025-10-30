"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Collaborator = {
  userId: string;
  email: string;
  createdAt: Date;
};

type DocumentCollaboratorsProps = {
  documentId: string;
  isOwner: boolean;
};

export function DocumentCollaborators({
  documentId,
  isOwner,
}: DocumentCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  const loadCollaborators = async () => {
    try {
      const response = await fetch(
        `/api/document/collaborators?documentId=${documentId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load collaborators");
      }

      const data = await response.json();
      setCollaborators(data);
      setShowCollaborators(true);
    } catch (error) {
      toast.error("Failed to load collaborators");
    }
  };

  const addCollaborator = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/document/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add collaborator");
      }

      toast.success("Collaborator added successfully");
      setEmail("");
      await loadCollaborators();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add collaborator"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const removeCollaborator = async (userId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/document/collaborators", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove collaborator");
      }

      toast.success("Collaborator removed successfully");
      await loadCollaborators();
    } catch (error) {
      toast.error("Failed to remove collaborator");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={loadCollaborators}
        size="sm"
        variant="outline"
      >
        {showCollaborators ? "Hide" : "Manage"} Collaborators
      </Button>

      {showCollaborators && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Add Collaborator</div>
            <div className="flex gap-2">
              <Input
                disabled={isLoading}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addCollaborator();
                  }
                }}
                placeholder="Enter email address"
                type="email"
                value={email}
              />
              <Button
                disabled={isLoading}
                onClick={addCollaborator}
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>

          {collaborators.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Current Collaborators</div>
              {collaborators.map((collaborator) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                  key={collaborator.userId}
                >
                  <span className="text-sm">{collaborator.email}</span>
                  <Button
                    disabled={isLoading}
                    onClick={() => removeCollaborator(collaborator.userId)}
                    size="sm"
                    variant="destructive"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {collaborators.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No collaborators yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
