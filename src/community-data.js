export const REVIEWED = "2026-10-19";
export const LINKS = Object.freeze({
  home: "https://www.redstone.finance/",
  docs: "https://docs.redstone.finance/",
  developers: "https://www.redstone.finance/developers",
  blog: "https://www.redstone.finance/blog",
  discord: "https://discord.com/invite/redstonedefi",
  x: "https://x.com/redstone_defi",
  github: "https://github.com/vlsss12/redstone-replay",
  basics:
    "https://www.redstone.finance/blog/redstone-the-invisible-tech-keeping-billions-in-defi-safe/",
  defaults:
    "https://github.com/redstone-finance/redstone-oracles-monorepo/blob/main/packages/evm-connector/contracts/core/RedstoneDefaultsLib.sol",
  consumer:
    "https://github.com/redstone-finance/redstone-oracles-monorepo/blob/main/packages/evm-connector/contracts/core/RedstoneConsumerBase.sol",
});
export const LESSONS = [
  {
    id: "oracle",
    number: "01",
    tag: "THE BIG IDEA",
    title: "Why does a blockchain need an oracle?",
    time: "2 min",
    description:
      "A blockchain knows its own transactions. An oracle helps bring information from outside that chain into an app.",
    body: "Imagine a lending app that needs the price of an asset. Its smart contract cannot simply browse a website. An oracle supplies external information in a form the contract can use. RedStone provides this kind of data infrastructure.",
    takeaway:
      "The oracle supplies information; the application decides how to use it.",
    source: LINKS.basics,
    question: "What does an oracle help a smart contract access?",
    answers: [
      "Information from outside its blockchain",
      "Your wallet’s secret recovery phrase",
      "A guaranteed investment return",
    ],
    correct: 0,
    feedback:
      "Exactly. An oracle supplies external information. It does not need your secret recovery phrase or guarantee returns.",
  },
  {
    id: "observations",
    number: "02",
    tag: "LOOK AT THE DATA",
    title: "Why look at more than one observation?",
    time: "3 min",
    description:
      "Different observations can disagree. A median is one way to summarise a group without taking a simple average.",
    body: "Sort three numbers: 99, 100 and 150. Their median is the middle value, 100. Real RedStone consumers also apply signature and signer rules; a tidy-looking median alone does not prove data is valid. Try moving an observation in the playground below.",
    takeaway: "A summary is useful, but it is only one part of checking data.",
    source: LINKS.consumer,
    question: "The observations are 99, 100 and 150. What is their median?",
    answers: ["116.33", "150", "100"],
    correct: 2,
    feedback:
      "The median is 100: the middle number after sorting. This is a teaching example, not a live market price.",
  },
  {
    id: "source-check",
    number: "03",
    tag: "READ WITH CONFIDENCE",
    title: "What does an announcement ask you to do?",
    time: "2 min",
    description:
      "Separate the news itself from any action you need to take. Start with the original announcement.",
    body: "A partnership or product announcement may be useful to understand without requiring you to connect a wallet or claim anything. Read the original source, notice its publication date, and check who it is intended for. The explainers below make those questions explicit.",
    takeaway:
      "An announcement is not automatically a task, a claim or a reward.",
    source: LINKS.blog,
    question: "A product announcement appears. What is a good first step?",
    answers: [
      "Connect a wallet to any reply with a claim link",
      "Read the original source, date and intended audience",
      "Assume it guarantees a community role",
    ],
    correct: 1,
    feedback:
      "Read the original source and who it is for. A launch alone does not establish a reward or role requirement.",
  },
];
export const GLOSSARY = [
  {
    term: "Oracle",
    definition:
      "A way for a blockchain application to receive information from outside its own chain.",
    source: LINKS.basics,
  },
  {
    term: "Price feed",
    definition:
      "A stream of price observations that an application can read and use under its own rules.",
    source: LINKS.developers,
  },
  {
    term: "Signature",
    definition:
      "Cryptographic evidence associated with a signing address. A consumer still needs rules about which signers it accepts.",
    source: LINKS.consumer,
  },
  {
    term: "Timestamp",
    definition:
      "A recorded time attached to data. It helps a consumer decide whether that data is recent enough.",
    source: LINKS.defaults,
  },
  {
    term: "Median",
    definition:
      "The middle value of sorted observations. The playground uses three observations to make this easy to see.",
    source: LINKS.defaults,
  },
  {
    term: "Onchain",
    definition:
      "Recorded or processed on a blockchain, rather than only on an external website or server.",
    source: LINKS.developers,
  },
  {
    term: "Push / pull",
    definition:
      "Two delivery approaches: data can be updated onchain ahead of use, or supplied when an application needs it.",
    source: LINKS.developers,
  },
  {
    term: "NAV",
    definition:
      "Net asset value: a valuation measure for a fund. A NAV oracle can carry that valuation onto a blockchain.",
    source:
      "https://www.redstone.finance/blog/openeden-selects-redstones-infrastructure-to-power-hybonds-nav-oracle-on-bnb-chain/",
  },
];
export const UPDATES = [
  {
    id: "sanctions",
    category: "PRODUCT EXPLAINED",
    title: "An oracle can carry more than a price.",
    published: "2026-10-08",
    reviewed: REVIEWED,
    source:
      "https://www.redstone.finance/blog/redstone-sanctions-oracle-institutional-aml-compliance-tool/",
    sourceTitle: "RedStone launches its Sanctions Oracle",
    what: "RedStone announced an onchain tool for protocols to check wallet addresses against sanctions-list data.",
    who: "Teams designing applications with address-screening requirements.",
    action:
      "No action is required to use this learning guide. This is a product explainer, not a wallet-screening or claim service.",
    meaning:
      "It is an example of external information being made available to smart contracts beyond asset prices.",
  },
  {
    id: "iso",
    category: "SECURITY EXPLAINED",
    title: "What does an information-security certificate mean?",
    published: "2026-09-24",
    reviewed: REVIEWED,
    source:
      "https://www.redstone.finance/blog/redstone-is-iso-iec-270012022-certified/",
    sourceTitle: "RedStone is ISO/IEC 27001:2022 certified",
    what: "RedStone announced certification of its information-security management system under ISO/IEC 27001:2022.",
    who: "Readers trying to understand the organisation’s information-security practices.",
    action:
      "You do not need to connect a wallet. Read the original scope if you want to understand what was certified.",
    meaning:
      "The announcement concerns RedStone’s stated certification scope. It does not certify this independent Field Guide or guarantee that every application is risk-free.",
  },
  {
    id: "nav",
    category: "INTEGRATION EXPLAINED",
    title: "How can a fund’s value reach a blockchain?",
    published: "2026-09-17",
    reviewed: REVIEWED,
    source:
      "https://www.redstone.finance/blog/openeden-selects-redstones-infrastructure-to-power-hybonds-nav-oracle-on-bnb-chain/",
    sourceTitle: "OpenEden selects RedStone for HYBOND’s NAV oracle",
    what: "RedStone described delivering HYBOND fund valuation data onto BNB Chain through its NAV oracle integration.",
    who: "People learning how tokenized funds use external valuation data.",
    action:
      "Reading the news does not require an investment or wallet connection. The source describes a product for eligible institutional investors.",
    meaning:
      "A fund valuation and a continuously traded market price are different kinds of information. Oracles can help applications access both.",
  },
];
export const TASKS = [
  {
    id: "review",
    interest: "help",
    minutes: 5,
    title: "Make a newcomer’s next step clearer",
    type: "FEEDBACK",
    description:
      "Walk through this guide as if it were your first visit. Find one instruction that needs a clearer word or a missing step.",
    deliverable:
      "A screenshot or exact sentence, the step where you got stuck, and a suggested improvement.",
    prompt:
      "Which exact step was confusing, and how would you explain it more clearly?",
  },
  {
    id: "explain",
    interest: "explain",
    minutes: 15,
    title: "Explain one idea in your own words",
    type: "EDUCATION",
    description:
      "Choose oracle, timestamp or median. Write a short explanation and one everyday example, with a primary source.",
    deliverable:
      "A short original explanation, an example and the official source you checked.",
    prompt:
      "What is your explanation, example or observation? Include what you checked rather than inventing personal experience.",
  },
  {
    id: "translate",
    interest: "explain",
    minutes: 30,
    title: "Make a small explanation accessible",
    type: "LANGUAGE",
    description:
      "Translate one short community-created explanation into a language you know well. Keep the meaning and distinguish terms that have no direct translation.",
    deliverable:
      "The original passage, your translation and the language. Ask a fluent reader to review it.",
    prompt:
      "Which community-created passage did you translate, and what wording needs a second reader?",
  },
  {
    id: "learn",
    interest: "learn",
    minutes: 15,
    title: "Ask a question with useful context",
    type: "COMMUNITY HELP",
    description:
      "Choose one concept you still do not understand. Say what you read, what you expected, and the exact part you want explained.",
    deliverable:
      "One focused question with its source and the part that is unclear.",
    prompt: "What did you read, and which precise part is still unclear?",
  },
];
export const STEPS = Object.freeze({
  oracle: {
    id: "oracle",
    title: "Understand what an oracle does",
    description: "A two-minute explanation and one quick check.",
    action: "lesson",
    target: "oracle",
    label: "Open the first lesson",
    minutes: 2,
  },
  playground: {
    id: "playground",
    title: "Move a number. See what changes.",
    description: "Try the median and data-age playground with invented values.",
    action: "section",
    target: "playground",
    label: "Try the playground",
    minutes: 2,
  },
  news: {
    id: "news",
    title: "Read one update with context",
    description:
      "Find what happened, who it matters to and whether you need to do anything.",
    action: "section",
    target: "updates",
    label: "Open the explainers",
    minutes: 1,
  },
  observations: {
    id: "observations",
    title: "Learn what a summary can tell you",
    description:
      "Understand a median and why signatures and consumer rules still matter.",
    action: "lesson",
    target: "observations",
    label: "Explore observations",
    minutes: 3,
  },
  "source-check": {
    id: "source-check",
    title: "Check a claim before sharing it",
    description:
      "Practice reading the original source, date and intended audience.",
    action: "lesson",
    target: "source-check",
    label: "Check your understanding",
    minutes: 2,
  },
  glossary: {
    id: "glossary",
    title: "Get comfortable with the language",
    description:
      "Look up the terms that slow you down. Each one has a primary source.",
    action: "section",
    target: "glossary",
    label: "Open the glossary",
    minutes: 3,
  },
  contribution: {
    id: "contribution",
    title: "Leave something useful behind",
    description:
      "Pick a small task and prepare a concrete contribution in your own words.",
    action: "section",
    target: "contribute",
    label: "Find a contribution",
    minutes: 10,
  },
});
