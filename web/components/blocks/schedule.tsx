import { ScheduleView } from "@/components/client/schedule-view";
import { SectionHead } from "@/components/shared/section-head";
import type { BlockProps } from "./types";

export function Schedule({ block, ctx }: BlockProps<"schedule">) {
  const p = block.props;
  const { courses } = ctx.site.collections;
  const list = courses.filter((c) => !p.category || c.category === p.category);
  const days = (p.days && p.days.length ? p.days : [1, 2, 3, 4, 5]).map(Number);
  return (
    <div className="sec" id="kursplan">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="reveal">
          <ScheduleView
            courses={list}
            variant={block.variant}
            days={days}
            weeksAhead={ctx.site.settings.booking.weeksAhead ?? 8}
            maxSeries={ctx.site.settings.booking.maxSeries ?? 12}
            cancelHours={ctx.site.settings.booking.cancelHours ?? 12}
          />
        </div>
      </div>
    </div>
  );
}
