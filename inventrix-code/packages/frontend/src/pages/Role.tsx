import { useRef } from "react";
import PageHeading from "../components/PageHeading";
import { gsap, useGSAP } from "../fx/gsap";
import { useTilt } from "../fx/useTilt";

type Accent = "cyan" | "lime" | "pink";

interface Member {
  no: number;
  name: string;
  role: string;
  roleEn: string;
  accent: Accent;
  duties: string[];
  photo: string;
  alt: string;
  /** Desktop placement on the 6-column grid: three cards per row, last row centred. */
  span: string;
}

const MEMBERS: readonly Member[] = [
  {
    no: 1,
    name: "Jac",
    role: "工程師",
    roleEn: "Engineer",
    accent: "cyan",
    duties: ["負責網頁與 AIDLC 應用的底層搭建"],
    photo: "/team/member-1.jpg",
    alt: "Jac：在霓虹街頭滑手機的長髮女生",
    span: "lg:col-span-2",
  },
  {
    no: 2,
    name: "五子棋創世神",
    role: "工程師",
    roleEn: "Engineer",
    accent: "cyan",
    duties: ["負責網頁開發", "實現了「五子棋」對弈功能"],
    photo: "/team/member-2.jpg",
    alt: "五子棋創世神：在電腦前比讚的戴眼鏡男生",
    span: "lg:col-span-2",
  },
  {
    no: 3,
    name: "都可以",
    role: "工程師",
    roleEn: "Engineer",
    accent: "cyan",
    duties: ["改寫了系統架構", "製作下單時的「歡慶動畫」"],
    photo: "/team/member-3.jpg",
    alt: "都可以：手拿飲料的戴眼鏡男生",
    span: "lg:col-span-2",
  },
  {
    no: 4,
    name: "已煩",
    role: "UX 策劃",
    roleEn: "UX Specialist",
    accent: "lime",
    duties: ["負責發想全站的 UX（使用者體驗）優化"],
    photo: "/team/member-4.jpg",
    alt: "已煩：開心握拳的長髮女生",
    span: "lg:col-span-2 lg:col-start-2",
  },
  {
    no: 5,
    name: "何維尼",
    role: "UI 設計",
    roleEn: "UI Specialist",
    accent: "pink",
    duties: ["負責發想 UI（使用者介面）優化，打造視覺效果"],
    photo: "/team/member-5.jpg",
    alt: "何維尼：喝著飲料比耶的戴眼鏡女生",
    span: "lg:col-span-2",
  },
];

const ACCENTS: Record<
  Accent,
  { text: string; border: string; glow: string; chip: string }
> = {
  cyan: {
    text: "text-neon-cyan",
    border: "hover:border-neon-cyan/70",
    glow: "hover:shadow-neon-cyan",
    chip: "border-neon-cyan/60 text-neon-cyan",
  },
  lime: {
    text: "text-neon-lime",
    border: "hover:border-neon-lime/70",
    glow: "hover:shadow-neon-lime",
    chip: "border-neon-lime/60 text-neon-lime",
  },
  pink: {
    text: "text-neon-pink",
    border: "hover:border-neon-pink/70",
    glow: "hover:shadow-neon-pink",
    chip: "border-neon-pink/60 text-neon-pink",
  },
};

function MemberCard({ member }: { member: Member }) {
  const ref = useRef<HTMLElement>(null);
  useTilt(ref, 7);
  const accent = ACCENTS[member.accent];

  return (
    <article
      ref={ref}
      data-member
      data-testid={`member-${member.no}`}
      className={`glass group relative flex flex-col overflow-hidden rounded-[var(--radius-blob)] transition-[box-shadow,border-color] duration-300 ${accent.border} ${accent.glow} ${member.span}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={member.photo}
          alt={member.alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), #ffffffaa, transparent 55%)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute bottom-3 left-5 font-display text-6xl leading-none font-black text-white/20"
        >
          {String(member.no).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-base font-bold tracking-wide text-white">
            {member.name}
          </span>
          <span
            className={`rounded-full border px-3 py-1 font-display text-[0.65rem] font-bold tracking-widest uppercase ${accent.chip}`}
          >
            {member.roleEn}
          </span>
        </div>
        <h2
          className={`font-display text-3xl leading-none font-black tracking-tight ${accent.text}`}
        >
          {member.role}
        </h2>
        <ul className="flex flex-col gap-2 text-white/75">
          {member.duties.map((duty) => (
            <li key={duty} className="flex gap-3">
              <span aria-hidden="true" className={`mt-2 size-1.5 shrink-0 rounded-full bg-current ${accent.text}`} />
              <span>{duty}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function Role() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-member]", {
        y: 80,
        opacity: 0,
        rotateX: -12,
        stagger: 0.12,
        duration: 0.9,
        ease: "back.out(1.5)",
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-10">
      <PageHeading kicker="AIDLC Team Members" title="ROLE" />
      <p className="max-w-2xl text-lg text-white/65">
        AIDLC 團隊成員與角色介紹：三位工程師、一位 UX 策劃與一位 UI 設計，
        一起把 Inventrix 從底層搭建到視覺細節。
      </p>
      <div
        data-testid="role-grid"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6"
      >
        {MEMBERS.map((member) => (
          <MemberCard key={member.no} member={member} />
        ))}
      </div>
    </div>
  );
}
