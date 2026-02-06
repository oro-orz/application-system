"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCheckSubmit } from "@/hooks/useCheckSubmit";
import { Application } from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faBan,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface ApprovalAreaProps {
  application: Application;
  onSubmitted: () => void;
}

export function ApprovalArea({ application, onSubmitted }: ApprovalAreaProps) {
  const [comment, setComment] = useState("");
  const [receiptChecked, setReceiptChecked] = useState(false);
  const [contentChecked, setContentChecked] = useState(false);
  const { submit, isSubmitting } = useCheckSubmit();

  const isExecutive = application.checkStatus === "役員確認待ち";

  const handleAccounting = async (
    action: "accounting_approve" | "accounting_reject" | "send_to_executive"
  ) => {
    try {
      await submit({
        applicationId: application.applicationId,
        action,
        checker: "経理担当者",
        comment: comment || undefined,
      });
      setComment("");
      setReceiptChecked(false);
      setContentChecked(false);
      onSubmitted();
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };

  const handleExecutive = async (
    action: "executive_approve" | "executive_reject"
  ) => {
    try {
      await submit({
        applicationId: application.applicationId,
        action,
        checker: "役員",
        comment: comment || undefined,
      });
      setComment("");
      onSubmitted();
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };

  const isReadOnly =
    application.checkStatus === "経理承認済" ||
    application.checkStatus === "最終承認済";
  if (isReadOnly) {
    return (
      <div className="p-4 space-y-3 text-body text-muted-foreground">
        <p>{application.accountingChecker && `担当: ${application.accountingChecker}`}</p>
        {application.accountingComment && (
          <p className="pt-2">{application.accountingComment}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {(application.accountingChecker || application.accountingComment) && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-1 text-body text-muted-foreground">
          {application.accountingChecker && (
            <p className="text-caption font-medium text-foreground">担当: {application.accountingChecker}</p>
          )}
          {application.accountingComment && (
            <p className="whitespace-pre-wrap">{application.accountingComment}</p>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-caption text-muted-foreground block">担当者コメント</label>
        <Textarea
          placeholder="コメントを入力してください"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
        />
      </div>

      {!isExecutive && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-body cursor-pointer">
            <Checkbox
              checked={receiptChecked}
              onCheckedChange={(c) => setReceiptChecked(c === true)}
            />
            領収書確認済
          </label>
          <label className="flex items-center gap-2 text-body cursor-pointer">
            <Checkbox
              checked={contentChecked}
              onCheckedChange={(c) => setContentChecked(c === true)}
            />
            金額・内容確認済
          </label>
        </div>
      )}

      {isExecutive ? (
        <div className="flex gap-2">
          <Button
            onClick={() => handleExecutive("executive_approve")}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <>
                <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
                承認
              </>
            )}
          </Button>
          <Button
            onClick={() => handleExecutive("executive_reject")}
            disabled={isSubmitting}
            variant="destructive"
            className="flex-1 rounded-xl"
          >
            {isSubmitting ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <>
                <FontAwesomeIcon icon={faBan} className="mr-2" />
                却下
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              onClick={() => handleAccounting("accounting_approve")}
              disabled={!receiptChecked || !contentChecked || isSubmitting}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
                  承認
                </>
              )}
            </Button>
            <Button
              onClick={() => handleAccounting("send_to_executive")}
              disabled={isSubmitting}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              {isSubmitting ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faUserTie} className="mr-2" />
                  役員相談
                </>
              )}
            </Button>
          </div>
          {application.checkStatus !== "差し戻し" && (
            <Button
              onClick={() => handleAccounting("accounting_reject")}
              disabled={isSubmitting}
              variant="destructive"
              className="w-full rounded-xl"
            >
              {isSubmitting ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faBan} className="mr-2" />
                  差し戻し
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
