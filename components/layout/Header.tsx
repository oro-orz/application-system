"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { getMonthOptions } from "@/lib/utils";
import { Application } from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInbox,
  faCircleCheck,
  faClock,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

interface HeaderProps {
  targetMonth: string;
  onMonthChange: (month: string) => void;
  applications: Application[];
}

function countByStatus(applications: Application[]) {
  let applied = 0;
  let approved = 0;
  let pending = 0;
  let rejected = 0;
  for (const app of applications) {
    switch (app.checkStatus) {
      case "未確認":
        applied++;
        break;
      case "経理承認済":
      case "最終承認済":
        approved++;
        break;
      case "役員確認待ち":
        pending++;
        break;
      case "差し戻し":
        rejected++;
        break;
      default:
        break;
    }
  }
  return { applied, approved, pending, rejected };
}

export function Header({
  targetMonth,
  onMonthChange,
  applications,
}: HeaderProps) {
  const monthOptions = getMonthOptions(12);
  const { applied, approved, pending, rejected } =
    countByStatus(applications);

  return (
    <header className="flex-shrink-0 border-b border-border bg-card px-6 py-4 rounded-b-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-heading font-semibold text-foreground">
          TMG精算
        </h1>

        <div className="flex items-center gap-4">
          <Select value={targetMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[160px] rounded-xl h-9">
              <SelectValue placeholder="対象月" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Card className="px-4 py-2 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-5 text-body-lg">
              <span className="flex items-center gap-2 text-muted-foreground" title="申請">
                <FontAwesomeIcon icon={faInbox} className="text-primary" />
                <span className="font-semibold text-foreground">{applied}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground" title="承認">
                <FontAwesomeIcon icon={faCircleCheck} className="text-green-600" />
                <span className="font-semibold text-foreground">{approved}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground" title="確認">
                <FontAwesomeIcon icon={faClock} className="text-amber-600" />
                <span className="font-semibold text-foreground">{pending}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground" title="却下">
                <FontAwesomeIcon icon={faBan} className="text-destructive" />
                <span className="font-semibold text-foreground">{rejected}</span>
              </span>
            </div>
          </Card>
        </div>
      </div>
    </header>
  );
}
