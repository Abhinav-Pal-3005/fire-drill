// Fraud Library content for Money Fire Drill
//
// IMPORTANT:
// - The image paths below are placeholders for individually licensed images/illustrations.
// - Amounts are reported by the cited source; some reports describe allegations/complaints,
//   not a final court finding. The wording below preserves that distinction.

export type FraudCategoryId =
  | "upi-pin-trap"
  | "wrong-transfer"
  | "lost-phone"
  | "instant-loan"
  | "phishing"
  | "digital-arrest";

export type FraudCase = {
  id: string;
  categoryId: FraudCategoryId;
  title: string;
  location: string;
  date: string;
  amountLost: string;
  summary: string;
  howItWorked: string;
  warningSigns: string[];
  safetyTips: string[];
  image: {
    src: string;
    alt: string;
    type: "illustrative";
    credit: string;
  };
  source: {
    publisher: string;
    title: string;
    url: string;
  };
};

export const fraudCategories: {
  id: FraudCategoryId;
  title: string;
  description: string;
}[] = [
  {
    id: "upi-pin-trap",
    title: "Receive-Money / UPI PIN Trap",
    description:
      "Scammers pretend to send money and trick people into approving a payment or scanning a payment QR code.",
  },
  {
    id: "wrong-transfer",
    title: "Wrong-Person Transfer / Refund Trap",
    description:
      "A scammer claims they sent too much money by mistake and pressures the victim to send a refund, often using fake payment proof or QR codes.",
  },
  {
    id: "lost-phone",
    title: "Lost or Stolen Phone",
    description:
      "A stolen or lost phone, SIM, or saved personal information is misused to access payment accounts.",
  },
  {
    id: "instant-loan",
    title: "Instant Loan App Trap",
    description:
      "Untrustworthy loan apps may hide fees, misuse personal data, and use threats or harassment to demand money.",
  },
  {
    id: "phishing",
    title: "Phishing SMS / Fake Bank Link",
    description:
      "Fake messages and websites imitate banks or service providers to steal account details, card data, or OTPs.",
  },
  {
    id: "digital-arrest",
    title: "Fake Authority Call / Digital Arrest",
    description:
      "Criminals impersonate police or government officials, invent a legal emergency, and demand money for supposed verification.",
  },
];

export const fraudCases: FraudCase[] = [
  // ---------------------------------------------------------------------------
  // 1. RECEIVE-MONEY / UPI PIN TRAP
  // ---------------------------------------------------------------------------
  {
    id: "upi-01",
    categoryId: "upi-pin-trap",
    title: "Student loses ₹90,000 while selling books online",
    location: "Bengaluru, Karnataka",
    date: "June 2025",
    amountLost: "₹90,000 reported lost",
    summary:
      "An 18-year-old student listed books for sale online. A person posing as a buyer contacted her and offered to pay, but the transaction ended with money being debited from her and her mother's accounts.",
    howItWorked:
      "The supposed buyer sent QR codes and described them as part of receiving or verifying payment. The student followed the prompts, and unauthorised debits followed. Her father intervened and the police reportedly froze the suspect's account.",
    warningSigns: [
      "The buyer wanted to complete payment through QR codes sent in chat.",
      "The buyer created confusion by describing debits as technical errors.",
      "The buyer rushed the seller through unfamiliar payment steps.",
    ],
    safetyTips: [
      "You do not scan a QR code or enter a UPI PIN to receive money.",
      "Check your UPI app or bank balance directly; do not trust screenshots.",
      "Stop the conversation if a buyer asks you to approve an unexpected collect request.",
    ],
    image: {
      src: "/images/fraud-library/upi-01.jpg",
      alt: "Illustration of a phone showing a suspicious QR payment request",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Times of India",
      title: "Bengaluru student loses Rs 90,000 to QR code scam while selling books",
      url: "https://timesofindia.indiatimes.com/city/bengaluru/bengaluru-student-trying-to-sell-books-online-suspects-scam-yet-loses-rs-90000-to-crook/articleshow/121981405.cms",
    },
  },
  {
    id: "upi-02",
    categoryId: "upi-pin-trap",
    title: "Techie loses nearly ₹1.9 lakh in an OLX QR-code scam",
    location: "Bengaluru, Karnataka",
    date: "August–September 2024",
    amountLost: "Nearly ₹1.9 lakh reported lost",
    summary:
      "A 27-year-old software engineer advertised an air cooler for sale. A supposed buyer agreed to the asking price and said he would pay before collecting it.",
    howItWorked:
      "The buyer sent a QR code and claimed it would help the seller receive the payment. A small transaction initially appeared to work. Later QR codes led to debits, while the buyer blamed technical problems and continued sending new codes.",
    warningSigns: [
      "The buyer offered to pay before collecting the item.",
      "The buyer sent repeated QR codes to fix supposed payment problems.",
      "The seller was asked to continue after money had already been debited.",
    ],
    safetyTips: [
      "Never scan a QR code to receive a payment.",
      "Do not follow payment instructions from an unknown buyer over a call.",
      "Stop immediately if an expected credit appears as a debit.",
    ],
    image: {
      src: "/images/fraud-library/upi-02.jpg",
      alt: "Illustration of an online marketplace chat beside a QR code",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "India Today",
      title: "Bengaluru man loses Rs 2 lakh in OLX QR code scam",
      url: "https://www.indiatoday.in/technology/news/story/bengaluru-man-loses-rs-2-lakh-in-olx-qr-code-scam-2592795-2024-09-03",
    },
  },
  {
    id: "upi-03",
    categoryId: "upi-pin-trap",
    title: "Bengaluru doctor reports ₹9.6 lakh QR-code fraud",
    location: "Bengaluru, Karnataka",
    date: "May 2024",
    amountLost: "₹9.6 lakh reported lost",
    summary:
      "A Bengaluru doctor listed household items for sale online and was contacted by someone posing as an interested buyer.",
    howItWorked:
      "The buyer used a sequence of apparently legitimate payment steps and then obtained information that enabled unauthorised withdrawals. A complaint was filed and police investigated the incident.",
    warningSigns: [
      "The buyer moved the conversation away from the marketplace.",
      "The buyer used QR codes as part of a supposed payment process.",
      "The process unexpectedly required sensitive banking information.",
    ],
    safetyTips: [
      "A buyer does not need your net-banking password, OTP, or UPI PIN to pay you.",
      "Use the official payment app and verify the actual credit before handing over an item.",
      "Never share screen access or banking credentials with a buyer.",
    ],
    image: {
      src: "/images/fraud-library/upi-03.jpg",
      alt: "Illustration of a person reviewing a suspicious payment request on a phone",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "Asianet Newsable",
      title: "Bengaluru doctor defrauded of Rs 9.6 lakh through QR Code scam",
      url: "https://newsable.asianetnews.com/amp/karnataka-news/bengaluru-doctor-defrauded-of-rs-9-6-lakh-through-qr-code-scam-while-selling-household-items-on-olx-vkp-scuebo",
    },
  },

  // ---------------------------------------------------------------------------
  // 2. WRONG-PERSON TRANSFER / REFUND TRAP
  // ---------------------------------------------------------------------------
  {
    id: "refund-01",
    categoryId: "wrong-transfer",
    title: "Gurugram seller loses over ₹4.5 lakh in a fake refund process",
    location: "Gurugram, Haryana",
    date: "March–May 2025",
    amountLost: "₹4,50,955 reported lost",
    summary:
      "A woman selling a used baby bouncer online was contacted by a person posing as a buyer. The agreed sale price was ₹6,000.",
    howItWorked:
      "The buyer sent a small amount to build trust, then claimed a split-payment or refund process was needed. QR codes and payment links were used to persuade the seller to authorise multiple transactions. The total reported debits were far higher than the sale price.",
    warningSigns: [
      "The buyer introduced a complicated split-payment process for a simple sale.",
      "The buyer asked the seller to send money back through QR codes or links.",
      "Repeated small explanations were used to justify more transactions.",
    ],
    safetyTips: [
      "If someone claims to have overpaid, check your bank statement yourself before doing anything.",
      "Never refund money to a different UPI ID based only on a screenshot or caller's claim.",
      "For a genuine mistaken transfer, contact your bank or payment provider and use its official process.",
    ],
    image: {
      src: "/images/fraud-library/refund-01.jpg",
      alt: "Illustration of a seller receiving a suspicious refund message",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Times of India",
      title: "Fraudster poses as owner of toy shop, cheats Gurgaon woman of Rs 4.5 lakh",
      url: "https://timesofindia.indiatimes.com/city/gurgaon/fraudster-poses-as-owner-of-toy-shop-cheats-gurgaon-woman-of-rs-4-5-lakh/articleshow/120776174.cms",
    },
  },
  {
    id: "refund-02",
    categoryId: "wrong-transfer",
    title: "Restaurant worker tricked by a fake excess-payment claim",
    location: "Goa, India",
    date: "May 2026 (reported June 2026)",
    amountLost: "₹6,000 reportedly sent as a refund",
    summary:
      "A hotel employee received a food order worth ₹2,500. The caller later claimed that ₹25,000 had been transferred by mistake and asked for the excess to be returned.",
    howItWorked:
      "The employee believed the caller's claim and sent ₹6,000. The report says the supposed ₹25,000 payment had not actually reached the business account, so the refund was sent from the employee's own funds.",
    warningSigns: [
      "The caller claimed a large payment had been made but the business could not see it.",
      "The caller asked for a refund before the payment was independently verified.",
      "The caller used urgency and a simple story to make the refund seem routine.",
    ],
    safetyTips: [
      "Never refund a payment that is not visible in the actual bank or UPI transaction history.",
      "Do not rely on SMS screenshots or a caller's screen recording as proof.",
      "Ask the business owner or bank to verify any claimed overpayment.",
    ],
    image: {
      src: "/images/fraud-library/refund-02.jpg",
      alt: "Illustration of a restaurant counter and a fake payment notification",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Times of India",
      title: "Cyber scammers dupe 500 Goans of Rs 3 crore in May alone",
      url: "https://timesofindia.indiatimes.com/city/goa/cyber-scammers-dupe-500-goans-of-rs-3-crore-in-may-alone/articleshow/131918585.cms",
    },
  },
  {
    id: "refund-03",
    categoryId: "wrong-transfer",
    title: "Fake QR payment process costs a Chandigarh family ₹2.79 lakh",
    location: "Chandigarh",
    date: "October 2024 (complaint reported April 2025)",
    amountLost: "₹2,79,900 reported lost",
    summary:
      "A mother and daughter advertised a dining table for ₹20,000. A person posing as a buyer contacted them and arranged payment through WhatsApp.",
    howItWorked:
      "The buyer sent QR codes and presented them as part of completing or correcting the payment. The daughter and her mother followed the instructions, and unauthorised debits were reported from both accounts.",
    warningSigns: [
      "The buyer insisted on QR codes instead of a normal payment confirmation.",
      "The buyer used a messaging app to direct the payment process.",
      "The seller was led to believe that scanning a code would complete a refund or receive money.",
    ],
    safetyTips: [
      "A QR code used for UPI generally initiates a payment; it does not receive money.",
      "Do not send a refund unless the original credit is visible and confirmed.",
      "Keep marketplace conversations and payment confirmation within official channels where possible.",
    ],
    image: {
      src: "/images/fraud-library/refund-03.jpg",
      alt: "Illustration of a family checking an unexpected QR payment request",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "Hindustan Times",
      title: "OLX fraud in Chandigarh: Posing as buyer, man dupes woman, daughter of ₹2.8L",
      url: "https://www.hindustantimes.com/cities/chandigarh-news/olx-fraud-in-chandigarh-posing-as-buyer-man-dupes-woman-daughter-of-28l-101745785049110.html",
    },
  },

  // ---------------------------------------------------------------------------
  // 3. LOST OR STOLEN PHONE
  // ---------------------------------------------------------------------------
  {
    id: "phone-01",
    categoryId: "lost-phone",
    title: "Bengaluru couple lose ₹2.5 lakh after phones are stolen",
    location: "Prayagraj, Uttar Pradesh / Bengaluru, Karnataka",
    date: "January–February 2024",
    amountLost: "₹2.5 lakh reported lost",
    summary:
      "A couple travelling on pilgrimage had their phones stolen in a crowded area. After returning home and getting replacement SIM cards, they discovered unauthorised UPI withdrawals.",
    howItWorked:
      "The report says money was transferred from the victim's account between the theft and the discovery of the fraud. The precise method used to access the accounts was not established in the article.",
    warningSigns: [
      "The fraud was discovered only after replacement SIM cards were activated.",
      "Unauthorised transactions had occurred while the phones were missing.",
      "The phone contained access to payment services and financial notifications.",
    ],
    safetyTips: [
      "Immediately contact your mobile operator to block a lost SIM and report the device missing.",
      "Call your bank and UPI provider to block or secure payment access.",
      "Use your phone's official lost-device feature and change important account passwords from a trusted device.",
    ],
    image: {
      src: "/images/fraud-library/phone-01.jpg",
      alt: "Illustration of a lost smartphone and a banking alert",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The New Indian Express",
      title: "Bengaluru couple go on pilgrimage, lose phones, Rs 2.5L",
      url: "https://www.newindianexpress.com/cities/bengaluru/2024/Feb/04/bengaluru-couple-go-on-pilgrimage-lose-phones-rs-25l",
    },
  },
  {
    id: "phone-02",
    categoryId: "lost-phone",
    title: "Delhi commuter loses ₹7.2 lakh after phone theft",
    location: "Delhi, India",
    date: "May–June 2025",
    amountLost: "₹7.2 lakh reported withdrawn",
    summary:
      "A commuter's phone was stolen while travelling on a bus. The victim later found that money had been withdrawn from three bank accounts.",
    howItWorked:
      "According to police, the accused used information stored on the unlocked phone, including a digital copy of the victim's Aadhaar card, to create a forged UPI identity and move money from linked accounts.",
    warningSigns: [
      "The stolen phone was not locked.",
      "Personal identity documents were stored on the device.",
      "Unauthorised transfers appeared after the phone was stolen.",
    ],
    safetyTips: [
      "Use a strong screen lock and enable device encryption and remote-lock features.",
      "Avoid keeping unprotected identity-document images alongside banking apps.",
      "Report the theft immediately and ask your bank and telecom provider to secure linked services.",
    ],
    image: {
      src: "/images/fraud-library/phone-02.jpg",
      alt: "Illustration of a stolen phone on public transport",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Week (PTI)",
      title: "Delhi Police arrests 3 men for siphoning off Rs 7.2 lakh using stolen phone",
      url: "https://www.theweek.in/wire-updates/national/2025/06/19/des88-dl-upi-fraud-arrest.html",
    },
  },
  {
    id: "phone-03",
    categoryId: "lost-phone",
    title: "Panchkula man loses ₹1.07 lakh after phone goes missing",
    location: "Panchkula, Haryana",
    date: "April–June 2025",
    amountLost: "₹1,07,800 reported withdrawn",
    summary:
      "A man's phone went missing. He reported the loss and obtained a duplicate SIM, but later discovered multiple unauthorised UPI transactions from his bank account.",
    howItWorked:
      "Police said the accused had stolen the phone and misused UPI services linked to the number. An arrest was reported within 24 hours of the complaint.",
    warningSigns: [
      "The phone went missing before unauthorised UPI transfers were discovered.",
      "The account was linked to the missing device and number.",
      "The victim discovered the loss only when checking with the bank.",
    ],
    safetyTips: [
      "Report a missing phone and block the SIM immediately.",
      "Contact the bank and UPI app provider to disable or secure payment access.",
      "Check account activity from another trusted device and report unknown transactions quickly.",
    ],
    image: {
      src: "/images/fraud-library/phone-03.jpg",
      alt: "Illustration of a phone theft report and a UPI transaction alert",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Indian Express",
      title: "Police arrest accused within 24 hrs of stealing disabled man's phone, cheating him of Rs 1.07 lakh",
      url: "https://indianexpress.com/article/cities/chandigarh/disabled-man-man-theft-phone-upi-10069255/",
    },
  },

  // ---------------------------------------------------------------------------
  // 4. INSTANT LOAN APP TRAP
  // ---------------------------------------------------------------------------
  {
    id: "loan-01",
    categoryId: "instant-loan",
    title: "₹10,500 loan turns into ₹2.49 lakh in demands",
    location: "Hyderabad case; accused traced to Gurugram",
    date: "2023 (police press note)",
    amountLost: "₹2,49,433 reportedly extracted after a ₹10,500 loan",
    summary:
      "Rachakonda Cyber Crime Police described a case in which a borrower received an instant loan of ₹10,500 through the Handy Loan app and was later targeted for much larger payments.",
    howItWorked:
      "Police said the accused used borrowers' personal information and threatened to circulate morphed images to the borrower and contacts. The press note says ₹2,49,433 was extracted from this victim.",
    warningSigns: [
      "The app or lender demanded broad access to personal data.",
      "The repayment demanded was far beyond the amount received.",
      "Collectors threatened to contact family or friends or circulate manipulated images.",
    ],
    safetyTips: [
      "Check whether a digital lender is associated with an RBI-regulated bank or NBFC.",
      "Do not grant unnecessary access to contacts, photos, messages, or files.",
      "Keep evidence of threats and report harassment to the cybercrime authorities and your bank.",
    ],
    image: {
      src: "/images/fraud-library/loan-01.jpg",
      alt: "Illustration of a suspicious instant-loan app with a warning symbol",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "Rachakonda Police",
      title: "Press note: Loan app cyber fraud gangs arrested for harassing borrowers",
      url: "https://rachakondapolice.telangana.gov.in/press-release/2023/Loan%20App%20Cyber%20Fraud%20Gangs%20Arrested.pdf",
    },
  },
  {
    id: "loan-02",
    categoryId: "instant-loan",
    title: "Woman reports blackmail after receiving less than the loan amount requested",
    location: "Begumpet, Hyderabad, Telangana",
    date: "December 2024",
    amountLost: "₹8,500 received against a ₹15,000 request; further demands reported",
    summary:
      "A woman complained to cybercrime police after applying for a ₹15,000 loan through an app called ManjiraCash and receiving only ₹8,500.",
    howItWorked:
      "According to her complaint, the app demanded repayment of ₹15,000 within a week, accessed personal data, and later used a selfie to create manipulated images. The complainant said the images and threats were used to demand more money even after repayment.",
    warningSigns: [
      "The amount received was much lower than the amount the app demanded back.",
      "The app accessed personal photos and contacts.",
      "Threats and demands continued after the borrower had repaid.",
    ],
    safetyTips: [
      "Read the full loan agreement, fees, lender identity, and repayment schedule before accepting.",
      "Avoid apps that demand access to contacts or personal photos without a clear need.",
      "Do not pay extortion demands just because a caller threatens embarrassment; preserve evidence and report it.",
    ],
    image: {
      src: "/images/fraud-library/loan-02.jpg",
      alt: "Illustration of a loan app displaying hidden fees and a privacy warning",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Times of India",
      title: "City woman files plaint against loan app for blackmail, harassment",
      url: "https://timesofindia.indiatimes.com/city/hyderabad/city-woman-files-plaint-against-loan-app-for-blackmail-harassment/articleshow/116839445.cms",
    },
  },
  {
    id: "loan-03",
    categoryId: "instant-loan",
    title: "Investigation into illegal loan apps spans 43 police cases",
    location: "Cyberabad and Rachakonda, Telangana",
    date: "2020–2024 (ED press release dated August 2024)",
    amountLost: "No single victim-loss figure stated in the cited release",
    summary:
      "The Enforcement Directorate said its investigation began after 43 FIRs involving mobile loan apps were registered by cybercrime police in Telangana.",
    howItWorked:
      "The ED described short-term loans with very high interest and processing fees. It said apps collected borrowers' photos, messages, and contact details, which were later misused to pressure people to repay. This is a multi-victim investigation, not one individual case.",
    warningSigns: [
      "Very short repayment windows and unclear or excessive fees.",
      "A lender asks for access to private data unrelated to providing a loan.",
      "Borrowers are pushed to take another loan to repay the first one.",
    ],
    safetyTips: [
      "Verify the actual lender and its regulatory status before borrowing.",
      "Do not install loan apps from links sent in unsolicited messages.",
      "Read the privacy policy and permissions; avoid apps that misuse personal data.",
    ],
    image: {
      src: "/images/fraud-library/loan-03.jpg",
      alt: "Illustration of several suspicious loan apps on a phone",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "Enforcement Directorate",
      title: "Press Release: Prosecution complaint in instant loan app case, 23 August 2024",
      url: "https://enforcementdirectorate.gov.in/sites/default/files/latestnews/Press%20Release-%20PC%20in%20Instant%20Loan%20App%20Case-23.8.2024.pdf",
    },
  },

  // ---------------------------------------------------------------------------
  // 5. PHISHING SMS / FAKE BANK LINK
  // ---------------------------------------------------------------------------
  {
    id: "phish-01",
    categoryId: "phishing",
    title: "Bengaluru couple report ₹15 lakh loss after fake KYC message",
    location: "Neelasandra, Bengaluru, Karnataka",
    date: "March 2025",
    amountLost: "₹15 lakh reported lost",
    summary:
      "A couple received a message claiming that their bank account needed a KYC update. The message included a link and warned that the account could be blocked.",
    howItWorked:
      "One of the victims opened the link and entered the requested details. The report says ₹10 lakh was taken from a joint account and ₹5 lakh from the woman's account in multiple transactions.",
    warningSigns: [
      "The message threatened account blocking to create urgency.",
      "The KYC request arrived through an unsolicited WhatsApp message.",
      "The link led to an unknown file or page rather than the bank's official app or website.",
    ],
    safetyTips: [
      "Do not open KYC links or APK files sent by unknown numbers.",
      "Contact the bank using the number on its official website, card, or app.",
      "Never enter an OTP, PIN, or password on a link received in a message.",
    ],
    image: {
      src: "/images/fraud-library/phish-01.jpg",
      alt: "Illustration of a fake KYC update SMS on a smartphone",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Times of India",
      title: "Couple loses 15 lakh in KYC update fraud",
      url: "https://timesofindia.indiatimes.com/city/bengaluru/copuple-loses-15-lakh-in-kyc-update-fraud/articleshow/118768121.cms",
    },
  },
  {
    id: "phish-02",
    categoryId: "phishing",
    title: "40 Mumbai bank customers targeted through fake KYC links",
    location: "Mumbai, Maharashtra",
    date: "March 2023",
    amountLost: "Victims collectively lost lakhs; one reported debit was ₹57,636",
    summary:
      "A report described 40 customers of a Mumbai-based private bank being duped over three days after receiving fake text messages asking them to update KYC and PAN details.",
    howItWorked:
      "The links opened websites designed to look like the bank. Victims were asked for customer IDs, passwords, and OTPs. One complainant reported that ₹57,636 was debited after she entered credentials and an OTP.",
    warningSigns: [
      "The message claimed KYC or PAN details had to be updated through a link.",
      "The linked page imitated the bank's website.",
      "A caller pretending to be a bank employee asked for another OTP.",
    ],
    safetyTips: [
      "Type the bank's official web address yourself or use its official app.",
      "Banks do not need you to disclose an OTP or PIN to a caller.",
      "If you entered details on a suspicious page, contact your bank immediately.",
    ],
    image: {
      src: "/images/fraud-library/phish-02.jpg",
      alt: "Illustration of a fake bank login page opened from an SMS",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "India Today",
      title: "40 bank customers duped of lakhs in Mumbai after clicking on unverified link",
      url: "https://www.indiatoday.in/amp/cities/mumbai/story/40-bank-customers-duped-of-lakhs-in-mumbai-after-clicking-on-unverified-link-2342945-2023-03-05",
    },
  },
  {
    id: "phish-03",
    categoryId: "phishing",
    title: "Senior citizen loses ₹45,000 after clicking a fake KYC link",
    location: "Delhi, India",
    date: "Case reported in 2025; consumer order in July 2026",
    amountLost: "₹45,000 debited; ₹55,000 compensation later reported",
    summary:
      "A senior citizen received an SMS asking him to complete bank KYC formalities. After he clicked the link, two unauthorised transactions were reported.",
    howItWorked:
      "The report says ₹20,000 was withdrawn through an ATM transaction and ₹25,000 was transferred from the account. The customer disputed the transactions, and a consumer commission later directed compensation.",
    warningSigns: [
      "An unsolicited SMS linked to a KYC update.",
      "Unexpected transactions occurred soon after the link was opened.",
      "The message pushed the customer to act through a link rather than a verified bank channel.",
    ],
    safetyTips: [
      "Use the bank's official app or visit a branch for KYC updates.",
      "Do not enter account credentials or OTPs on message links.",
      "Report unauthorised transactions to the bank immediately and keep the complaint reference.",
    ],
    image: {
      src: "/images/fraud-library/phish-03.jpg",
      alt: "Illustration of a senior citizen receiving a suspicious bank SMS",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Indian Express",
      title: "Senior citizen man clicks fake bank KYC link, loses Rs 45,000, wins Rs 55,000 compensation",
      url: "https://indianexpress.com/article/legal-news/senior-citizen-fake-bank-kyc-link-money-rs-55000-payout-10786091/",
    },
  },

  // ---------------------------------------------------------------------------
  // 6. FAKE AUTHORITY CALL / DIGITAL ARREST
  // ---------------------------------------------------------------------------
  {
    id: "arrest-01",
    categoryId: "digital-arrest",
    title: "Bengaluru software engineer loses ₹11.8 crore to fake officials",
    location: "Bengaluru, Karnataka",
    date: "November–December 2024",
    amountLost: "₹11.8 crore reported lost",
    summary:
      "A software engineer received calls from people claiming to be officials. They alleged that his identity was connected to illegal activity and threatened consequences for him and his family.",
    howItWorked:
      "The callers used video calls and a fabricated legal process, including a supposed Supreme Court hearing. They cited fake verification rules and persuaded the victim to transfer money to accounts they controlled.",
    warningSigns: [
      "Callers claimed to be police or government officials over messaging or video calls.",
      "They threatened immediate arrest or consequences for family members.",
      "They demanded money transfers for supposed verification or clearance.",
    ],
    safetyTips: [
      "There is no legal process called digital arrest in India.",
      "Do not transfer money to prove innocence or for police verification.",
      "End the call and independently contact the relevant agency through an official number.",
    ],
    image: {
      src: "/images/fraud-library/arrest-01.jpg",
      alt: "Illustration of a fake police video call on a laptop",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Indian Express",
      title: "Bengaluru software engineer loses whopping Rs 11.8 crore to digital arrest scam",
      url: "https://indianexpress.com/article/cities/bangalore/bengaluru-software-engineer-digital-arrest-scam-9740036/",
    },
  },
  {
    id: "arrest-02",
    categoryId: "digital-arrest",
    title: "Ghaziabad woman reports losing over ₹50 lakh in 28 days",
    location: "Vaishali, Ghaziabad, Uttar Pradesh",
    date: "April–May 2025",
    amountLost: "Over ₹50 lakh reported lost",
    summary:
      "A retired teacher received a call from someone claiming to represent the telecom regulator. The caller said her phone number was involved in illegal activity.",
    howItWorked:
      "The fraudsters allegedly kept her on video calls for long periods and instructed her to transfer money in several instalments. They used the threat of a criminal case and secrecy to isolate her from help.",
    warningSigns: [
      "The caller claimed a phone number was linked to a serious crime.",
      "The victim was kept on video calls and told not to speak to others.",
      "Large transfers were demanded in instalments for supposed investigation.",
    ],
    safetyTips: [
      "A government agency will not conduct an arrest or investigation by keeping you on a private video call.",
      "Do not keep the matter secret at a caller's instruction; speak to a trusted person.",
      "Verify any official claim independently and report suspicious calls.",
    ],
    image: {
      src: "/images/fraud-library/arrest-02.jpg",
      alt: "Illustration of a video call showing a fake official identity",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Indian Express",
      title: "How Ghaziabad woman lost over Rs 50 lakh in digital arrest over 28 days",
      url: "https://indianexpress.com/article/cities/delhi/ghaziabad-woman-digital-arrest-fraud-9981603/",
    },
  },
  {
    id: "arrest-03",
    categoryId: "digital-arrest",
    title: "Hyderabad retiree reports ₹1.14 crore loss to fake police and CBI callers",
    location: "Hyderabad, Telangana",
    date: "July 2025",
    amountLost: "₹1.14 crore reported transferred",
    summary:
      "An 80-year-old retired public-sector employee received calls from people posing as Bengaluru police and CBI officials. They claimed his identity was linked to money laundering.",
    howItWorked:
      "The callers appeared in police uniforms during a video call and asked the victim and his wife to share bank details. They then instructed the couple to transfer money to accounts for supposed verification. A family friend helped the victim recognise the fraud.",
    warningSigns: [
      "Officials appeared over an unsolicited WhatsApp video call.",
      "The callers asked for bank details and transfers to accounts for verification.",
      "The victim was pressured to act before independently checking the claims.",
    ],
    safetyTips: [
      "Real police and investigative agencies do not ask people to transfer savings for verification.",
      "Never share banking details or OTPs with callers claiming to be officials.",
      "Pause, contact family, and verify through official police or government channels.",
    ],
    image: {
      src: "/images/fraud-library/arrest-03.jpg",
      alt: "Illustration of a suspicious video call impersonating law enforcement",
      type: "illustrative",
      credit: "Add a licensed illustration or an original team-created graphic.",
    },
    source: {
      publisher: "The Times of India",
      title: "80-year-old retired PSU staffer in Hyderabad loses Rs 1 crore in digital arrest scam",
      url: "https://timesofindia.indiatimes.com/city/hyderabad/80-year-old-retired-psu-staffer-in-hyderabad-loses-rs-1-crore-in-digital-arrest-scam/articleshow/123027858.cms",
    },
  },
];

// Small helper for the UI: get all cases belonging to one category.
export const getCasesByCategory = (categoryId: FraudCategoryId): FraudCase[] =>
  fraudCases.filter((fraudCase) => fraudCase.categoryId === categoryId);

// Optional helper for search boxes.
export const searchFraudCases = (query: string): FraudCase[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return fraudCases;

  return fraudCases.filter((fraudCase) =>
    [
      fraudCase.title,
      fraudCase.location,
      fraudCase.summary,
      fraudCase.howItWorked,
      fraudCase.categoryId,
      ...fraudCase.warningSigns,
      ...fraudCase.safetyTips,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
};
