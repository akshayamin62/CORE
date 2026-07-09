'use client';

import {
  ivyPointerInfoPanelClass,
  ivyPointerInfoSubtitleClass,
  ivyPointerInfoSectionClass,
  ivyPointerInfoSectionTitleClass,
  ivyPointerInfoItemClass,
} from '@/components/studentDetailResponsive';

interface InfoPanelProps {
  pointerNo: number;
}

const infoContent = {
  1: {
    subtitle: "Ivy Leagues want intellectual curiosity, not just report cards",
    sections: [
      {
        heading: "Must-have:",
        items: [
          "Top 5-10% class ranking or equivalent (90%+ in CBSE/ICSE/IB)",
          "High SAT/ACT scores (typically 1450+ SAT or 52+ ACT)",
          "Strong AP/IB/Advanced coursework (if available)",
          "National or international academic achievements (e.g., Olympiads, NTSE, ICSE/ISC/CBSE toppers)"
        ]
      },
      {
        heading: "Pro Tip:",
        text: "Deep engagement with learning outside the classroom - research, MOOCs, passion projects - counts more than just marks."
      }
    ]
  },
  2: {
    subtitle: "Ivy schools prefer students who go deep and wide in one compelling area.",
    sections: [
      {
        heading: "Examples:",
        items: [
          "Published author at age 17",
          "Founded a startup or NGO with measurable impact",
          "Conducted original research (even pre-college)",
          "Olympiad medalist or national-level athlete",
          "Built an AI tool solving a real-world problem",
          "Created a viral app or social media campaign with civic impact"
        ]
      },
      {
        heading: "Message:",
        text: "They want \"outliers\" - not just checklist-followers."
      }
    ]
  },
  3: {
    subtitle: "IVY LEAGUES LOVE SELF-STARTERS, CHANGEMAKERS, AND BOLD THINKERS.",
    sections: [
      {
        heading: "Must-show:",
        items: [
          "Founded or led a club, initiative, campaign, or business",
          "Took leadership in crisis (e.g., COVID volunteer, education access)",
          "Started a podcast, YouTube channel, or publication",
          "Mentored juniors or built community initiatives"
        ]
      },
      {
        heading: "Important:",
        text: "Leadership isn't always titles—it's impact and ownership."
      }
    ]
  },
  4: {
    subtitle: "IVY LEAGUES SEEK STUDENTS WHO THINK BEYOND THEMSELVES.",
    sections: [
      {
        heading: "Examples:",
        items: [
          "Started a rural education initiative",
          "Built a platform connecting underprivileged students to tutors",
          "Published policy research or attended UN youth summits",
          "Developed tech for sustainability or public health",
          "Awareness campaigns on gender, mental health, climate, etc."
        ]
      },
      {
        heading: "Message:",
        text: "They want future global leaders, activists, entrepreneurs, and scientists."
      }
    ]
  },
  5: {
    subtitle: "THE PERSONAL ESSAY IS YOUR SOUL ON PAPER.",
    sections: [
      {
        heading: "What they seek:",
        items: [
          "Honesty over perfection",
          "Unique life experiences or identity",
          "Personal challenges and growth",
          "Deep self-awareness and purpose",
          "Passion that feels lived—not just claimed"
        ]
      },
      {
        heading: "Message:",
        text: "A well-written, introspective, emotionally intelligent essay can outweigh small gaps in scores."
      }
    ]
  },
  6: {
    subtitle: "THEY LOVE STUDENTS WHO LOVE LEARNING FOR LEARNING'S SAKE.",
    sections: [
      {
        heading: "How to show it:",
        items: [
          "Started a blog or research journal",
          "Pursued university-level coursework via Coursera, EdX, etc.",
          "Connected academic interest with real-world application (e.g., Econ student analyzing inflation at local market)",
          "Initiated at local market"
        ]
      },
      {
        heading: "Message:",
        text: "Ivy Leagues are academic havens—they want students who nerd out, passionately."
      }
    ]
  }
};

export default function IvyLeagueApplicantInfoPanel({ pointerNo }: InfoPanelProps) {
  const content = infoContent[pointerNo as keyof typeof infoContent];

  if (!content) return null;

  return (
    <div className={ivyPointerInfoPanelClass}>
      <div className="mb-6 max-md:mb-3">
        {content.subtitle && (
          <p className={ivyPointerInfoSubtitleClass}>{content.subtitle}</p>
        )}
      </div>

      <div className="space-y-6 max-md:space-y-3">
        {content.sections.map((section, idx) => (
          <div key={idx} className={ivyPointerInfoSectionClass}>
            {section.heading && (
              <h3 className={ivyPointerInfoSectionTitleClass}>{section.heading}</h3>
            )}

            {section.items && section.items.length > 0 && (
              <ul className="ml-4 space-y-2 max-md:ml-3 max-md:space-y-1.5">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-3 text-gray-700 max-md:gap-2">
                    <span className="shrink-0 font-black text-blue-600">•</span>
                    <span className={ivyPointerInfoItemClass}>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.text && (
              <p className={`${ivyPointerInfoItemClass} font-medium italic`}>{section.text}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-2 max-md:hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-blue-400" />
        ))}
      </div>
    </div>
  );
}
