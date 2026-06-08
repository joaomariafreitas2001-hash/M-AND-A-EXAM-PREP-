#!/usr/bin/env python3
"""Generate quiz-data.js with balanced option lengths."""
import json
import os
import random

RNG = random.Random(42)

def _shuffle_options(correct, wrongs):
    wrongs = list(wrongs[:3])
    correct_idx = RNG.randint(0, 3)
    final = []
    wi = 0
    for pos in range(4):
        if pos == correct_idx:
            final.append(correct)
        else:
            final.append(wrongs[wi])
            wi += 1
    return final, correct_idx

# Longer distractors so the correct answer is not always the longest option
DISTRACTOR_UPGRADES = {
    "Lock-out / exclusivity agreements prevent the seller from:": [
        "Paying dividends to existing shareholders",
        "Hiring employees during the sale process",
        "Filing annual reports with regulators",
    ],
    "White Squire defense:": [
        "Target company launches a bid for the attacker",
        "Regulator automatically blocks all hostile bids",
        "Forced IPO of the target within 28 days",
    ],
    "Greenshoe allows underwriters to:": [
        "Cancel the IPO if demand is weak",
        "Trigger a poison pill at listing",
        "Avoid publishing any prospectus",
    ],
    "Golden parachutes:": [
        "Block all hostile takeovers permanently",
        "Guarantee synergy delivery post-close",
        "Replace poison pills in every jurisdiction",
    ],
    "SPA indemnity clauses cover:": [
        "Future revenue growth of the combined group",
        "IPO first-day pop and stabilisation costs",
        "Earn-out metrics and management bonuses",
    ],
    "Walk-away price in negotiation is:": [
        "Always equal to the opening bid price",
        "Set by regulators before negotiations",
        "Equal to book value of net assets",
    ],
    "Hard post-acquisition problems are mostly:": [
        "Only HR payroll and benefits issues",
        "Always purely regulatory in nature",
        "Unrelated to synergies or deal pricing",
    ],
    "An Integration Manager should:": [
        "Replace all acquired staff on day one",
        "Write the IPO prospectus for listing",
        "Set poison pill terms for the combined group",
    ],
    "Over-commitment problem means acquirer:": [
        "Pays too little premium for the target",
        "Skips due diligence entirely pre-close",
        "Avoids all debt financing in the deal",
    ],
    "Insider trading in takeover context is:": [
        "Required disclosure before any public bid",
        "The same as a bear hug approach",
        "Standard IPO book-building practice",
    ],
    "UK PUSU rule means:": [
        "Poison pill mandatory in all UK deals",
        "IPO must complete within 28 days",
        "No hostile bids allowed in the UK",
    ],
    "Poison pill works by:": [
        "Selling crown jewels to a friendly buyer",
        "Paying golden parachutes to executives",
        "Withdrawing the IPO registration",
    ],
    "Bear hug is:": [
        "Pac-Man defense against a hostile bidder",
        "Insider trading ahead of a public bid",
        "Earn-out clause in the sale agreement",
    ],
    "Firm commitment underwriting:": [
        "Underwriter sells only what it can place",
        "No investment bank is involved at all",
        "Deal is cancelled if 50% remains unsold",
    ],
    "Equity carve-out IPO:": [
        "Floats the entire parent group at once",
        "Is always structured as a hostile bid",
        "Requires no disclosure to investors",
    ],
    "Secondary IPO offering:": [
        "Company raises new capital from investors",
        "Mandatory step after every MBO exit",
        "Same mechanism as a greenshoe option",
    ],
    "Primary IPO offering:": [
        "Only existing shareholders sell their stake",
        "Always structured as a carve-out only",
        "Requires no regulator review or approval",
    ],
    "In asset deals the buyer typically:": [
        "Inherits all past liabilities of the seller",
        "Gets all tax credits without any limits",
        "Must buy 100% of shares in the target",
    ],
    "Representations and warranties are:": [
        "Future revenue guarantees from the seller",
        "IPO greenshoe terms set by underwriters",
        "Poison pill ratios for hostile defence",
    ],
    "Somerdale controversy:": [
        "Failed IPO of the Cadbury confectionery unit",
        "Antitrust block of the Kraft takeover bid",
        "Currency hedge loss on the deal financing",
    ],
    "Key 2020 driver for bank M&A:": [
        "Crypto boom and digital asset demand",
        "Rising net interest margins across Europe",
        "Wave of IPO listings by Spanish banks",
    ],
    "Deal made Cadbury urgent because:": [
        "IPO requirement under UK listing rules",
        "Government bank bailout of Cadbury",
        "Poison pill activation by the board",
    ],
    "Employees' second priority question:": [
        "What colour will the office decor be?",
        "How old is the acquiring company's CEO?",
        "What is the acquirer's stock ticker symbol?",
    ],
    "Merger has the highest commitment because:": [
        "Only a licence to use the brand is granted",
        "Joint venture is temporary by definition",
        "Minority stake below 50% is acquired",
    ],
    "Post-MBO debt typically sits on:": [
        "Seller's books only after the transaction",
        "Government fund as a subsidised loan",
        "IPO prospectus as disclosed liability",
    ],
}

def _extend_wrongs_to_match(correct, wrongs):
    """Add at most one suffix per distractor so correct is not the sole longest."""
    wrongs = list(wrongs[:3])
    extras = [" typically", " in practice", " generally", " broadly"]
    for si in sorted(range(3), key=lambda i: len(wrongs[i])):
        if len(correct) <= max(len(w) for w in wrongs):
            break
        extra = extras[si % len(extras)]
        if extra.strip() not in wrongs[si]:
            wrongs[si] += extra
    return correct, wrongs

LECTURE_CONTEXT = {
    1: "Lecture 1 rule: only synergy/efficiency creates real economic value. Market power redistributes value; managerial motives (agency, hubris, imitation) destroy value. Control premium (~35%) must stay below synergies for the acquirer to win.",
    2: "Lecture 2: 12-phase process—integration plan (phase 8) comes before due diligence (phase 9). NDA at first contact; LOI is non-binding; DD is the core risk tool; SPA carries warranties, indemnities, and non-compete clauses.",
    3: "Lecture 3: hard post-deal problems usually trace to bad strategy, price, or DD. Soft problems are cultural—anger, fear, loss of identity. Communicate promptly; integrate fast; ~67% of acquired managers leave within four years.",
    5: "Lecture 5 (MBOs): managers buy via Newco; debt lands on the target. Typical leverage 3-5x Debt/EBITDA. Value = (EBITDA x exit multiple) - net debt. PE targets IRR > 15% over 3-7 years.",
    6: "Lecture 6 (PE/VC): classic 2% fee + 20% carry above ~8% hurdle. LPs provide capital; GPs manage. Tag-along protects minorities; drag-along forces sale in a 100% exit.",
    7: "Lecture 7 (takeovers): friendly = board supports bid; hostile = direct to shareholders. Defences include poison pill, crown jewels, white knight, bear hug. Spain: >30% triggers mandatory bid.",
    8: "Lecture 8 (IPO): direct costs ~5-10%; structural undervaluation ~10-15% (first-day pop). Greenshoe stabilises price; firm commitment vs best efforts underwriting differ on who bears placement risk.",
}

DEAL_CONTEXT = {
    1: "Deal: Microsoft · LinkedIn ($26.2bn, 2016)—all-cash scope deal; federated integration preserved brand and CEO.",
    2: "Deal: CaixaBank · Bankia (2020-21)—all-share scale merger; state (FROB) exit; domestic banking consolidation.",
    3: "Deal: Amazon · Whole Foods ($13.7bn, 2017)—vertical scope play; physical grocery footprint for omnichannel.",
    4: "Deal: Facebook · Instagram (~$1bn, 2012)—pre-revenue scope bet; among the best M&A investments ever.",
    5: "Deal: Kraft · Cadbury ($19.5bn, 2010)—hostile-to-friendly; hubris and Mondelez spin signal mixed outcome.",
    6: "Deal: Disney · Fox ($71.3bn, 2019)—IP/streaming scope; Comcast counterbid raised price.",
    7: "Deal: Marriott · Starwood (~$13.6bn, 2016)—scale + SPG loyalty; Anbang counterbid.",
    8: "Deal: VW · Porsche—reverse takeover; Porsche options debt and GFC flipped control to VW.",
    9: "Deal: LVMH · Tiffany ($15.8bn, 2021)—luxury scope; pandemic MAC dispute renegotiated price.",
}

def _clean_option(s):
    s = s.strip()
    for suffix in (" typically", " in practice", " generally", " broadly", " often"):
        if s.endswith(suffix):
            s = s[: -len(suffix)]
    return s

def build_explanation_detail(text, correct, wrong, base, lecture=None, deal=None):
    correct_c = _clean_option(correct)
    wrong_c = [_clean_option(w) for w in wrong[:3]]
    parts = []
    b = base.strip()
    if b:
        parts.append(b if b.endswith(".") else b + ".")
    parts.append(
        f'"{correct_c}" is the syllabus answer: it matches the precise concept tested in this question.'
    )
    if lecture and lecture in LECTURE_CONTEXT:
        parts.append(LECTURE_CONTEXT[lecture])
    elif deal is not None and deal in DEAL_CONTEXT:
        parts.append(DEAL_CONTEXT[deal])
    elif deal == 0:
        parts.append(
            "Cross-topic question: link the answer to patterns across the nine case studies (scale vs scope, payment form, premium, integration style)."
        )
    labels = ", ".join(f'"{w}"' for w in wrong_c)
    parts.append(
        f"The other options ({labels}) are exam distractors—they relate to adjacent topics but do not satisfy the definition or fact required here."
    )
    return " ".join(parts)

def q(text, correct, wrong, explanation, difficulty, deal=None, lecture=None):
    text = text.replace("\u2014", " - ")
    correct = correct.replace("\u2014", " - ")
    wrong = list(DISTRACTOR_UPGRADES.get(text, wrong))
    wrong = [w.replace("\u2014", " - ") for w in wrong]
    detail = build_explanation_detail(text, correct, wrong, explanation, lecture, deal)
    correct, wrong = _extend_wrongs_to_match(correct, wrong)
    opts, ci = _shuffle_options(correct, wrong)
    item = {
        "text": text,
        "options": opts,
        "correct": ci,
        "explanation": explanation,
        "explanationDetail": detail,
        "difficulty": difficulty,
    }
    if deal is not None:
        item["deal"] = deal
    if lecture is not None:
        item["lecture"] = lecture
    return item

QUESTIONS = []

# ========== LECTURE 1 ==========
L1 = [
    q("Which motive for acquisitions creates real economic value?", "Efficiency and synergies", ["Market power alone", "Managerial prestige", "Buying undervalued assets"], "Only synergies create value per course framework.", "easy", lecture=1),
    q("Hubris and agency problems in M&A are classified as:", "Value-destroying manager motives", ["Core synergy drivers", "Primary efficiency gains", "Mandatory legal steps"], "Managers: agency, hubris, imitation destroy value.", "medium", lecture=1),
    q("Average US control premium is about:", "35%", ["10%", "20%", "60%"], "Course cites ~35% from takeover studies.", "easy", lecture=1),
    q("For the acquirer to gain, control premium must be:", "Less than expected synergies", ["Equal to book value", "Greater than synergies", "Ignored in valuation"], "Premium < synergies or acquirer loses.", "medium", lecture=1),
    q("Cross-selling between merged firms is a:", "Soft (revenue) synergy", ["Hard cost synergy", "Legal form of alliance", "Due diligence type"], "Soft synergies = revenue side.", "easy", lecture=1),
    q("Personnel redundancies after a merger are:", "Hard synergies", ["Soft synergies only", "Always illegal", "Never counted in models"], "Hard synergies include personnel cost cuts.", "easy", lecture=1),
    q("Horizontal integration has the highest risk of:", "Antitrust and cultural conflict", ["Supplier dependence", "No synergies ever", "IPO failure"], "Same sector = high integration + antitrust.", "medium", lecture=1),
    q("A joint venture on the legal forms ladder has:", "Medium commitment level", ["Lowest commitment", "Highest commitment", "No legal structure"], "JV sits between licence and majority stake.", "medium", lecture=1),
    q("Organic (internal) growth is preferred when:", "Culture must stay homogeneous", ["Speed is critical", "Debt is unavailable", "Target is listed"], "Organic = slower but no integration clash.", "easy", lecture=1),
    q("Sellers of family businesses often cite:", "Lack of successors or retirement", ["Mandatory EU merger rules", "Poison pill activation", "IPO undervaluation"], "Family sale motives include succession gaps.", "medium", lecture=1),
    q("Diversification acquisitions typically offer:", "Lowest cultural conflict risk", ["Highest antitrust risk", "No flexibility", "Mandatory all-cash payment"], "Low operational overlap = lower culture clash.", "medium", lecture=1),
    q("Tax shields in merged groups are an example of:", "Hard financial synergies", ["Soft revenue synergies", "IPO costs", "Earn-out metrics"], "Tax = hard synergy category.", "hard", lecture=1),
    q("The imitation motive ('me too' deals) falls under:", "Managers block (no value creation)", ["Efficiency block", "Market position block", "Opportunity block"], "Managerial motives destroy value.", "medium", lecture=1),
    q("Vertical integration mainly creates redundancies in:", "Administration and finance", ["R&D only", "Board governance only", "IPO road shows"], "Vertical = buyer-supplier link.", "hard", lecture=1),
    q("A merger differs from acquisition because reversal needs:", "A spin-off", ["Only board approval", "No shareholder vote", "Automatic delisting"], "Merger = single entity; unwind via spin-off.", "medium", lecture=1),
]

# ========== LECTURE 2 ==========
L2 = [
    q("Phase 8 in the 12-step process is:", "Integration plan", ["Due diligence", "Closing only", "Post-deal analysis"], "Integration plan before DD (phase 9).", "easy", lecture=2),
    q("Phase 9 in the acquisition process is:", "Due diligence", ["First contact", "Negotiation only", "Business objectives"], "DD verifies assumptions after integration planning.", "easy", lecture=2),
    q("An NDA is typically signed at:", "First contact", ["After closing", "IPO road show", "Post-integration"], "Confidentiality at start of talks.", "easy", lecture=2),
    q("Lock-out / exclusivity agreements prevent the seller from:", "Talking to other buyers during negotiations", ["Paying dividends", "Hiring staff", "Filing annual reports"], "Exclusivity protects buyer's process.", "medium", lecture=2),
    q("Winner's curse in auctions means:", "The winner often overpays", ["Target always wins", "No premium is paid", "DD is skipped"], "Competitive bidding pushes price up.", "medium", lecture=2),
    q("EBITDA multiple pricing formula:", "Price = (Multiple x EBITDA) - Debt", ["Price = Revenue x P/E", "Price = Assets only", "Price = EBITDA / WACC"], "Standard course multiple formula.", "medium", lecture=2),
    q("Earn-outs defer payment based on:", "Future financial performance", ["Past book value only", "Regulator approval", "Stock index level"], "Earn-out ties price to future metrics.", "easy", lecture=2),
    q("In asset deals the buyer typically:", "Avoids unknown contingent liabilities", ["Inherits all past liabilities", "Gets all tax credits automatically", "Must buy 100% of shares"], "Asset purchase = selected assets.", "medium", lecture=2),
    q("The LOI is generally:", "Non-binding framework pre-DD", ["Fully binding SPA", "Filed with CNMV only", "Hostile bid document"], "LOI sets terms before binding SPA.", "easy", lecture=2),
    q("Vendor due diligence is commissioned by:", "The seller", ["The buyer only", "Regulators", "Trade unions"], "Seller's DD speeds process, reduces asymmetry.", "medium", lecture=2),
    q("Cultural due diligence examines:", "Leadership style and compatibility", ["Only stock price", "IPO greenshoe", "Poison pills"], "Cultural DD as important as financial.", "medium", lecture=2),
    q("SPA indemnity clauses cover:", "Breach of representations and warranties", ["Future revenue growth", "IPO first-day pop", "Earn-out metrics only"], "Indemnity = seller compensates warranty breaches.", "hard", lecture=2),
    q("Investment banks in M&A typically earn:", "Retainer plus success fee", ["Hourly only", "No fees on failure", "Carried interest 20%"], "IB: retainer + success fee.", "medium", lecture=2),
    q("Debt financing in acquisitions offers:", "Tax-deductible interest", ["No repayment ever", "Zero leverage impact", "Automatic synergy capture"], "Debt cheaper but raises leverage.", "easy", lecture=2),
    q("Virtual data rooms are used during:", "Due diligence", ["IPO stabilisation", "Poison pill trigger", "MBO exit only"], "Structured document sharing in DD.", "easy", lecture=2),
    q("Walk-away price in negotiation is:", "Maximum/minimum acceptable before exit", ["Always the opening bid", "Set by regulators", "Equal to book value"], "BATNA discipline: know your limit.", "medium", lecture=2),
]

# ========== LECTURE 3 ==========
L3 = [
    q("Hard post-acquisition problems are mostly:", "Pre-deal failures (strategy, DD, price)", ["Only HR payroll issues", "Always regulatory", "Unrelated to synergies"], "Bad strategy/price = hard problems.", "easy", lecture=3),
    q("Soft post-acquisition problems include:", "Culture and communication", ["Only tax audits", "Bond covenants", "IPO costs"], "Soft = human/cultural post-close.", "easy", lecture=3),
    q("Manager turnover in acquired firms within 4 years:", "About 67%", ["About 10%", "About 25%", "About 95%"], "Course statistic on manager exits.", "medium", lecture=3),
    q("Employees' top merger question is:", "Am I included in the new org?", ["Stock ticker symbol?", "CEO's age?", "Office decor?"], "Job security first.", "easy", lecture=3),
    q("Integration should be rapid to:", "Reduce uncertainty and retain talent", ["Avoid all communication", "Skip synergy planning", "Delay DD"], "Slow integration prolongs fear.", "medium", lecture=3),
    q("Lowest cultural risk is in:", "Diversification deals", ["Horizontal mergers", "Hostile takeovers", "Same-brand mergers"], "Minimal overlap = low culture clash.", "easy", lecture=3),
    q("'Loss of identity' is one of:", "Seven cultural emotional dimensions", ["Twelve acquisition phases", "IPO placement types", "MBO debt tranches"], "Course lists 7 emotional dimensions.", "medium", lecture=3),
    q("Communication in mergers should be:", "Prompt, frequent, and coherent", ["Rare and vague", "Delegated to HR only", "External-only"], "Acquiring mgmt must be visible.", "easy", lecture=3),
    q("Corporate arrogance in integration is:", "Acquirer disrespecting acquired team", ["Required by regulators", "Same as earn-out", "IPO book-building"], "Hubris kills acquired talent.", "medium", lecture=3),
    q("An Integration Manager should:", "Supervise the full integration process", ["Replace all acquired staff", "Write the IPO prospectus", "Set poison pill terms"], "Dedicated integration leadership.", "easy", lecture=3),
    q("Over-commitment problem means acquirer:", "Neglects core business during integration", ["Pays too little premium", "Skips DD entirely", "Avoids all debt"], "Integration consumes management attention.", "hard", lecture=3),
    q("Psychological contract breach causes:", "Fear and disengagement in staff", ["Higher IPO pop", "Automatic badwill", "Poison pill dilution"], "Unwritten expectations violated.", "hard", lecture=3),
]

# ========== LECTURE 5 ==========
L5 = [
    q("MBO stands for:", "Management Buyout", ["Market Book Offer", "Merger By Operation", "Minority Buy Option"], "Existing managers buy the firm.", "easy", lecture=5),
    q("MBI carries higher risk than MBO because:", "Buyers lack prior business knowledge", ["No debt is used", "PE is excluded", "No exit exists"], "Outside managers = higher risk.", "medium", lecture=5),
    q("Post-MBO debt typically sits on:", "Target balance sheet after absorption", ["Seller's books only", "Government fund", "IPO prospectus"], "Newco merges into target with debt.", "medium", lecture=5),
    q("Typical post-MBO Debt/EBITDA is:", "3 to 5 times", ["0.1 times", "20 times", "No leverage"], "Leverage jumps from <1x pre-deal.", "easy", lecture=5),
    q("MBO exit value formula:", "(EBITDA x Exit Multiple) - Net Debt", ["Revenue / employees", "Book value only", "P/E x shares only"], "Core L5 profitability equation.", "medium", lecture=5),
    q("PE target IRR is at least:", "15%", ["5%", "8%", "50%"], "Course: IRR > 15%, 3-7 year horizon.", "easy", lecture=5),
    q("Equity ratchet increases management stake when:", "IRR or multiple thresholds are beat", ["Debt is repaid early", "IPO is cancelled", "Poison pill triggers"], "Aligns mgmt with PE on outperformance.", "medium", lecture=5),
    q("Senior debt in MBOs has:", "First claim in default", ["No security ever", "Lowest priority", "Only equity conversion"], "Senior secured, lower rate.", "medium", lecture=5),
    q("Post-MBO priority is to:", "Service the debt", ["Maximise headcount", "Avoid all cost cuts", "Delay integration"], "Cash flow must cover debt.", "easy", lecture=5),
    q("SBO means:", "Secondary Buyout (PE to PE)", ["Stock Buyback Only", "Strategic Board Option", "Seller Bond Offering"], "Common PE exit route.", "easy", lecture=5),
    q("LBU strategy uses:", "Platform plus roll-up acquisitions", ["IPO only", "Poison pills", "Hostile tender"], "Leveraged build-up in fragmented sectors.", "hard", lecture=5),
    q("Managers' '6 Fs' include:", "Focused, fast, flexible", ["Formal, frozen, fearful", "Federated, foreign, fiscal", "Fixed, funded, franchised"], "Course manager profile traits.", "hard", lecture=5),
    q("PE typically provides what % of MBO equity?", "20-40%", ["80-100%", "1-2%", "Zero"], "Rest is debt + manager equity.", "medium", lecture=5),
    q("Trade sale as exit is:", "Sale to strategic acquirer", ["IPO mandatory", "Write-off only", "Government nationalisation"], "Often highest price exit.", "easy", lecture=5),
]

# ========== LECTURE 6 ==========
L6 = [
    q("GP in a PE fund is:", "General Partner (manager)", ["Government Pension", "Global Premium", "Growth Plan"], "GP manages and deploys capital.", "easy", lecture=6),
    q("Classic PE fund economics:", "2% fee + 20% carry above hurdle", ["Hourly billing only", "50% salary", "No carry"], "2 and 20 with ~8% hurdle.", "easy", lecture=6),
    q("LP commitment period is about:", "10 years", ["1 year", "30 years", "3 months"], "Closed-end fund life ~10 years.", "medium", lecture=6),
    q("Tag-along rights protect:", "Minority investors on a sale", ["Hostile bidders", "Regulators", "Bondholders only"], "Minority joins majority sale.", "medium", lecture=6),
    q("Drag-along rights let majority:", "Force minorities to sell in 100% deal", ["Block all exits", "Avoid DD", "Cancel IPO"], "Buyer needs 100% clean exit.", "medium", lecture=6),
    q("Business angels invest typically:", "Under EUR 1 million at seed/start-up", ["Over EUR 100M in utilities", "Only in LBOs", "Only post-IPO"], "Angels: small, early, hands-on.", "easy", lecture=6),
    q("Expansion capital exit routes include:", "Trade sale, IPO, MBO, SBO", ["Only write-off", "Poison pill", "Mandatory merger"], "Same exit menu as PE generally.", "medium", lecture=6),
    q("VC buyout stage targets:", "Mature companies (all sectors)", ["Only seed concepts", "Only governments", "Only IPOs"], "Buyout = mature company acquisition.", "medium", lecture=6),
    q("Expansion capital control without daily ops uses:", "Board seats and veto rights", ["Full operational management", "Poison pills", "Hostile tender"], "Governance not operations.", "hard", lecture=6),
    q("Carried interest is paid on:", "Profits above hurdle rate", ["All revenue", "Management salaries", "IPO filing fees"], "20% of gains above ~8% hurdle.", "medium", lecture=6),
]

# ========== LECTURE 7 ==========
L7 = [
    q("Friendly takeover means:", "Board supports the bid", ["Board opposes bid", "No premium paid", "Only asset sale"], "Negotiated vs hostile.", "easy", lecture=7),
    q("Spain: over 30% voting rights requires:", "Mandatory bid for 100%", ["Automatic delisting", "No action", "IPO filing"], "Spanish takeover threshold.", "medium", lecture=7),
    q("Poison pill works by:", "Diluting acquirer via discounted shares", ["Selling crown jewels", "Paying golden parachutes", "IPO withdrawal"], "Pre-bid classic defense.", "medium", lecture=7),
    q("Bear hug is:", "Public offer board can't easily refuse", ["Pac-Man defense", "Insider trading", "Earn-out clause"], "Shareholder pressure tactic.", "medium", lecture=7),
    q("Pac-Man defense:", "Target bids for the attacker", ["White Knight appears", "Poison pill only", "Asset strip only"], "Role reversal post-bid.", "hard", lecture=7),
    q("White Knight is:", "Friendly rival bidder", ["Hostile bidder", "Regulator", "Auditor"], "Alternative acquirer invited.", "easy", lecture=7),
    q("Hostile targets often have:", "Dispersed shareholder base", ["100% family ownership", "Government as sole owner", "No tradeable shares"], "Easier to accumulate votes.", "medium", lecture=7),
    q("Golden parachutes:", "Increase takeover cost via executive payouts", ["Block all M&A", "Guarantee synergies", "Replace poison pills"], "Pre-bid executive protection.", "medium", lecture=7),
    q("Insider trading in takeover context is:", "Illegal use of non-public bid information", ["Required disclosure", "Same as bear hug", "IPO book-building"], "Strictly prohibited.", "easy", lecture=7),
    q("UK PUSU rule means:", "Put up or shut up (firm bid or withdraw)", ["Poison pill mandatory", "IPO within 28 days", "No hostile bids"], "28-day clock after public approach.", "hard", lecture=7),
    q("White Squire defense:", "Friendly investor takes blocking minority stake", ["Target buys attacker", "Regulator blocks deal", "IPO forced"], "Blocks hostile bidder.", "hard", lecture=7),
    q("Hostile bids often use cash because:", "Certainty for dispersed shareholders", ["Stock is illegal", "No premium needed", "Board requires it"], "Cash = certainty vs stock risk.", "medium", lecture=7),
]

# ========== LECTURE 8 ==========
L8 = [
    q("IPO means:", "Initial Public Offering", ["Internal Profit Option", "Integrated Purchase Offer", "Institutional Poison Pill"], "First public share sale.", "easy", lecture=8),
    q("Direct IPO costs are about:", "5-10% of proceeds", ["0.1%", "25%", "50%"], "Plus 10-15% indirect undervaluation.", "medium", lecture=8),
    q("Greenshoe allows underwriters to:", "Issue ~15% extra shares for price stability", ["Cancel the IPO", "Trigger poison pill", "Avoid prospectus"], "1-month stabilisation tool.", "medium", lecture=8),
    q("Firm commitment underwriting:", "Underwriter buys full issue and resells", ["Sells only what it can", "No bank involved", "Cancels if 50% unsold"], "Bank bears placement risk.", "hard", lecture=8),
    q("Primary IPO offering:", "Company issues new shares for capital", ["Only existing SH sell", "Always a carve-out", "No regulator review"], "New money to issuer.", "easy", lecture=8),
    q("Book-building sets price via:", "Institutional demand in road show", ["Fixed regulator formula", "Random lottery", "Poison pill ratio"], "Demand indications set price.", "medium", lecture=8),
    q("First-day IPO pop reflects:", "~10-15% structural undervaluation", ["Free company profit", "Illegal manipulation", "Earn-out payment"], "Cost of attracting investors.", "medium", lecture=8),
    q("Equity carve-out IPO:", "Floats part of subsidiary; parent keeps control", ["Sells entire group", "Is always hostile", "Requires no disclosure"], "Partial subsidiary listing.", "hard", lecture=8),
    q("Spain IPO minimum capital:", "Over EUR 1,202,025", ["EUR 10,000", "EUR 1 million only", "No minimum"], "Plus shareholder and profit rules.", "hard", lecture=8),
    q("Best IPO timing is typically:", "Bull market with optimistic investors", ["Deep recession only", "During hostile bid", "After poison pill"], "Higher valuations, lower discount.", "easy", lecture=8),
    q("Secondary IPO offering:", "Existing shareholders sell; no new capital", ["Company raises new cash", "Mandatory for MBO", "Same as greenshoe"], "Liquidity for insiders.", "medium", lecture=8),
    q("Black-out period in IPO:", "Banks cannot publish recommendations", ["Trading is banned forever", "DD is skipped", "Poison pill active"], "Pre-pricing quiet period.", "hard", lecture=8),
]

# ========== EXTRA LECTURE QUESTIONS (full revision) ==========
EXTRA_L1 = [
    q("Greenfield investment is:", "Internal (organic) growth", ["Hostile takeover", "PE buyout", "IPO carve-out"], "Build from scratch, not buy.", "easy", lecture=1),
    q("Market power motive primarily:", "Redistributes value between parties", ["Always creates synergies", "Guarantees low premium", "Eliminates antitrust risk"], "Partial value transfer, not pure creation.", "medium", lecture=1),
    q("Opportunity motive (buy cheap) lacks:", "Strategic vision", ["Any premium paid", "Due diligence", "Legal structure"], "Undervaluation alone is not a strategy.", "medium", lecture=1),
    q("Hard synergies are considered:", "More reliable than soft synergies", ["Always illegal", "Only revenue-based", "Ignored in valuation"], "Cost cuts easier to model than revenue.", "easy", lecture=1),
    q("A consortium / UTE alliance has:", "Temporary commitment", ["Highest legal integration", "Mandatory IPO", "100% ownership"], "Joint project, time-limited.", "medium", lecture=1),
    q("Vertical integration risk level:", "Medium integration intensity", ["Highest antitrust only", "Zero redundancies", "No supplier link"], "Buyer-supplier relationship.", "medium", lecture=1),
    q("Value equation: acquirer gains if:", "Synergies exceed control premium", ["Premium equals book value", "Revenue doubles", "Debt is zero"], "Core L1 value framework.", "easy", lecture=1),
    q("Economies of scope mean:", "More products through same structure", ["Only headcount cuts", "IPO listing", "Poison pill trigger"], "Scope = product breadth on shared base.", "medium", lecture=1),
    q("Subsidiary sellers may divest to:", "Focus on core business", ["Mandatory EU IPO", "Increase conglomerate risk", "Avoid all tax"], "Retrenchment in crisis.", "medium", lecture=1),
    q("Merger has the highest commitment because:", "Full legal integration into one entity", ["Only licence granted", "JV is temporary", "Minority stake only"], "Reversal needs spin-off.", "medium", lecture=1),
]
EXTRA_L2 = [
    q("Phase 1 of acquisition process:", "Define business objectives", ["Due diligence", "Closing", "Post-deal analysis"], "Starts with strategic why.", "easy", lecture=2),
    q("Phase 10 is:", "Closing", ["Integration plan", "First contact", "Screening only"], "Legal completion of transaction.", "easy", lecture=2),
    q("Phase 11 is:", "Post-acquisition integration", ["Auction only", "IPO road show", "Poison pill design"], "Execute integration post-close.", "easy", lecture=2),
    q("DCF valuation uses:", "PV of future free cash flows at WACC", ["Book value only", "Revenue / employees", "Poison pill ratio"], "Intrinsic value method.", "medium", lecture=2),
    q("Cash as payment gives seller:", "Certainty (no acquirer stock risk)", ["Mandatory dilution", "Earn-out only", "No premium"], "Cash is certain value.", "easy", lecture=2),
    q("Share (equity swap) payment:", "Seller becomes acquirer shareholder", ["Avoids all liabilities", "Is always hostile", "Requires IPO first"], "Seller takes stock risk.", "medium", lecture=2),
    q("SPA non-competition covenants:", "Restrict seller competing post-close", ["Block all M&A forever", "Set IPO price", "Replace DD"], "Protects buyer from seller rivalry.", "medium", lecture=2),
    q("Representations and warranties are:", "Seller factual statements about target", ["Future revenue guarantees", "IPO greenshoe terms", "Poison pill ratios"], "Basis for indemnity claims.", "medium", lecture=2),
    q("Labour due diligence covers:", "Contracts, pensions, disputes", ["Only stock ticker", "IPO book-building", "Greenshoe size"], "HR and pension risk.", "hard", lecture=2),
    q("Information memorandum is prepared by:", "The seller", ["Regulators only", "Trade unions", "Hostile bidder"], "Seller's offering to buyers.", "easy", lecture=2),
    q("Equity financing disadvantage:", "Dilutes acquirer control", ["Tax-deductible interest", "No shareholder vote", "Automatic synergies"], "New shares dilute owners.", "medium", lecture=2),
    q("BATNA in negotiation means:", "Best alternative if deal fails", ["Binding auction rule", "IPO blackout", "Poison pill trigger"], "Walk-away discipline.", "medium", lecture=2),
]
EXTRA_L3 = [
    q("Anger in cultural integration is:", "Forced adoption of new culture", ["IPO undervaluation", "Earn-out metric", "Senior debt rate"], "Emotional dimension #1.", "hard", lecture=3),
    q("Employees' second priority question:", "How will I participate in the future?", ["Office decor colour?", "CEO age?", "Stock symbol only?"], "After job inclusion.", "medium", lecture=3),
    q("Horizontal deals have cultural risk:", "High", ["Zero always", "Lowest of all types", "Only in IPOs"], "Competitors with distinct identities.", "easy", lecture=3),
    q("Hard problem #5 is:", "Excessive price paid", ["IPO greenshoe", "Poison pill", "Earn-out only"], "Pre-deal pricing failure.", "hard", lecture=3),
    q("Integration guideline #1:", "Define strategy and integration plan", ["Delay all communication", "Skip synergy planning", "Delegate to media only"], "Roles from day one.", "easy", lecture=3),
    q("Winners and losers feeling means:", "Acquired staff feel they lost", ["Both sides win equally", "Only regulators lose", "IPO pop for all"], "Emotional dimension #7.", "medium", lecture=3),
    q("Falling commitment happens when:", "Uncertainty drags on too long", ["Deal closes in 1 day", "Premium is zero", "DD is skipped"], "Talent leaves during delay.", "medium", lecture=3),
    q("Culture is invisible until:", "It collides with another culture", ["IPO files", "Poison pill triggers", "Earn-out pays"], "Merger exposes differences.", "medium", lecture=3),
]
EXTRA_L5 = [
    q("BIMBO combines:", "Internal and external managers", ["Only PE investors", "Only banks", "Only regulators"], "Blend MBO and MBI.", "medium", lecture=5),
    q("IBO is led by:", "PE firm without incumbent management", ["Family heirs only", "Government", "IPO underwriters"], "Institutional buyout.", "hard", lecture=5),
    q("Ideal MBO target has:", "Stable predictable free cash flow", ["High existing leverage only", "No brands", "Unpredictable losses"], "Cash must service debt.", "easy", lecture=5),
    q("Mezzanine debt is:", "Subordinated behind senior", ["First claim always", "Equity only", "Government grant"], "Higher rate, often warrants.", "medium", lecture=5),
    q("Senior debt typical rate:", "5-7%", ["50%", "0%", "20% carry"], "Lower rate, secured.", "hard", lecture=5),
    q("PE exit in 3 years implies IRR about:", "27%", ["5%", "8%", "50%"], "Course IRR horizon table.", "hard", lecture=5),
    q("MBO Step 1 creates:", "Newco funded by equity + debt", ["Immediate IPO", "Poison pill", "Hostile tender"], "Newco buys target.", "medium", lecture=5),
    q("Value creation source #3 is:", "Leverage the acquisition", ["IPO road show", "Poison pill", "Skip DD"], "Debt amplifies equity return.", "medium", lecture=5),
    q("Manager age profile ideal:", "35-55 years", ["Under 20 only", "Over 70 only", "No experience needed"], "Experienced but not retiring.", "medium", lecture=5),
    q("LBU works best in:", "Fragmented immature industries", ["Monopoly utilities only", "No acquisitions allowed", "IPO-only sectors"], "Platform plus roll-ups.", "medium", lecture=5),
]
EXTRA_L6 = [
    q("LP in PE fund is:", "Limited Partner (investor)", ["Legal Proxy", "Listed Premium", "Leverage Provider"], "LPs provide capital.", "easy", lecture=6),
    q("Hurdle rate in PE is about:", "8%", ["50%", "0%", "35% premium"], "Carry kicks in above hurdle.", "medium", lecture=6),
    q("VC seed stage invests in:", "Concept / start-up phase", ["Mature utilities only", "Government bonds", "Post-IPO only"], "Earliest VC stage.", "medium", lecture=6),
    q("Accountants in M&A charge:", "Hourly fees", ["2% carry only", "Success fee only", "No fees"], "Contrast with IB retainer+success.", "medium", lecture=6),
    q("PE monitoring post-deal adds:", "Financial discipline and network", ["Poison pills", "IPO mandate", "Hostile bids"], "Operational support not daily ops.", "easy", lecture=6),
    q("Expansion capital targets:", "Companies needing growth funding", ["Only bankrupt firms", "Only governments", "Only pre-revenue apps"], "Growth stage PE/VC.", "medium", lecture=6),
]
EXTRA_L7 = [
    q("Crown jewels defense:", "Sell key assets to reduce appeal", ["Poison pill only", "IPO forced", "Earn-out clause"], "Strip valuable units.", "medium", lecture=7),
    q("Litigation can stall a bid by:", "Delaying timetable and raising cost", ["Guaranteeing synergies", "Lowering premium", "Forcing cash only"], "Legal friction tactic.", "hard", lecture=7),
    q("Hostile bid document is:", "Offer direct to shareholders", ["LOI to CEO only", "Internal memo", "IPO prospectus"], "Bypass resistant board.", "easy", lecture=7),
    q("Bear hug pressures board via:", "Public offer shareholders may accept", ["Secret NDA only", "Earn-out metric", "Greenshoe"], "Public pressure tactic.", "medium", lecture=7),
    q("Stock in hostile bids is harder because:", "Shareholders bear acquirer risk", ["Illegal in all markets", "No premium allowed", "Board must reject"], "Cash gives certainty.", "medium", lecture=7),
]
EXTRA_L8 = [
    q("Best efforts underwriting:", "Underwriter sells what it can", ["Buys entire issue", "No bank role", "Cancels IPO"], "vs firm commitment.", "hard", lecture=8),
    q("IPO stabilisation tool:", "Greenshoe option (~15% extra)", ["Poison pill", "Earn-out", "Lock-out agreement"], "Price support post-listing.", "medium", lecture=8),
    q("Indirect IPO cost includes:", "10-15% structural undervaluation", ["Zero cost", "50% fee only", "Debt covenant"], "First-day pop cost.", "medium", lecture=8),
    q("IPO road show targets:", "Institutional investors", ["Only employees", "Only regulators", "Only trade unions"], "Book-building demand.", "easy", lecture=8),
    q("Carve-out IPO parent:", "Keeps majority control of unit", ["Must sell 100%", "Is always hostile", "Requires no disclosure"], "Partial subsidiary float.", "medium", lecture=8),
]

QUESTIONS.extend(L1 + L2 + L3 + L5 + L6 + L7 + L8 + EXTRA_L1 + EXTRA_L2 + EXTRA_L3 + EXTRA_L5 + EXTRA_L6 + EXTRA_L7 + EXTRA_L8)

# ========== DEALS (balanced rewrites + extras) ==========
def dq(n, text, correct, wrong, explanation, difficulty):
    return q(text, correct, wrong, explanation, difficulty, deal=n)

DEALS = [
    # Deal 1 Microsoft-LinkedIn
    dq(1, "Microsoft-LinkedIn deal value:", "$26.2bn", ["$13.7bn", "$19.5bn", "$71.3bn"], "All-cash, closed Dec 2016.", "easy"),
    dq(1, "LinkedIn premium over close was:", "49.5%", ["20%", "27%", "34%"], "At $196/share.", "easy"),
    dq(1, "Microsoft beat Salesforce mainly via:", "All-cash, no financing condition", ["Higher stock offer", "Hostile tender", "Government subsidy"], "Structure beat $186 mixed bid.", "medium"),
    dq(1, "LinkedIn deal financed by:", "~$20bn bond issuance", ["Equity only", "Asset sale", "ECB loan"], "Avoided offshore cash repatriation tax.", "medium"),
    dq(1, "Microsoft-LinkedIn deal type:", "Scope / capability acquisition", ["Pure cost merger", "Distressed loan", "IPO carve-out"], "Data, cloud, CRM scope deal.", "medium"),
    dq(1, "LinkedIn integration model:", "Federated autonomy (CEO kept)", ["Full Nokia-style merge", "Immediate shutdown", "Spin-off in 1 year"], "Weiner stayed; brand preserved.", "medium"),
    dq(1, "Symmetric termination fee was:", "$725m each side", ["$400m", "Zero", "$10bn"], "Signalled regulatory confidence.", "hard"),
    dq(1, "LinkedIn EV/Revenue at deal was about:", "8.76x", ["2.5x", "15x", "50x"], "High end of SaaS comps.", "hard"),
    # Deal 2 CaixaBank-Bankia
    dq(2, "CaixaBank-Bankia structure:", "All-share merger", ["All-cash tender", "Asset strip", "Hostile only"], "0.6845 CBK per Bankia share.", "easy"),
    dq(2, "Bankia was nationalised in:", "2012", ["2008", "2020", "2016"], "After savings bank merger losses.", "medium"),
    dq(2, "Combined entity assets:", "Over EUR 660bn", ["EUR 50bn", "EUR 200bn", "EUR 1tn"], "Spain's largest domestic bank.", "easy"),
    dq(2, "Key 2020 driver for bank M&A:", "Negative rates and branch overcapacity", ["Crypto boom", "Rising NIM", "IPO wave"], "Structural profitability crisis.", "medium"),
    dq(2, "FROB stake in Bankia was about:", "61.8%", ["5%", "100%", "0%"], "State exit drove timing.", "hard"),
    dq(2, "Badwill concept in banking:", "Buy below book; negative goodwill", ["Always pays premium", "IPO requirement", "Poison pill"], "CaixaBank-Bankia context.", "hard"),
    dq(2, "Exchange ratio was:", "0.6845 CBK per Bankia share", ["1:1 cash", "0.1 only", "Fixed EUR price"], "20% premium on unaffected ratio.", "medium"),
    # Deal 3 Amazon-WFM
    dq(3, "Amazon paid for Whole Foods:", "$13.7bn", ["$1bn", "$26.2bn", "$71.3bn"], "All-cash June 2017.", "easy"),
    dq(3, "WFM share of Amazon revenue:", "Under 4%", ["About 25%", "About 50%", "Over 75%"], "Infrastructure not earnings play.", "medium"),
    dq(3, "Activist before Amazon deal:", "JANA Partners (8.8%)", ["Berkshire Hathaway", "FROB", "Anbang"], "Pushed strategic review.", "medium"),
    dq(3, "Amazon-WFM deal type:", "Scope / vertical integration", ["Pure bank merger", "Hostile only", "MBO"], "Physical grocery footprint.", "easy"),
    dq(3, "Deal closed in:", "August 2017", ["2012", "2021", "2009"], "Announced June 2017.", "easy"),
    dq(3, "Post-deal sector effect:", "Rivals built omnichannel delivery", ["Grocery went offline only", "Amazon exited retail", "No reaction"], "Target/Shipt, Kroger/Ocado.", "medium"),
    dq(3, "First contact to signing took:", "About 55 days", ["5 days", "3 years", "1 day"], "Compressed friendly process.", "hard"),
    # Deal 4 Facebook-Instagram
    dq(4, "Instagram acquired in:", "2012", ["2008", "2019", "2016"], "5 weeks before FB IPO.", "easy"),
    dq(4, "Instagram revenue at deal:", "Zero", ["$2bn", "$500m", "$32bn"], "Pre-revenue strategic bet.", "easy"),
    dq(4, "Instagram consideration:", "$300m cash + FB shares", ["100% cash", "Earn-out only", "Debt bridge"], "~$715m at close.", "medium"),
    dq(4, "Instagram users at close:", "About 30 million", ["3 billion", "500", "1 million"], "iOS-focused growth.", "medium"),
    dq(4, "Integration approach:", "Deferred; brand preserved", ["Day-one full merge", "Shut down app", "Rebrand as FB Photos"], "Among best M&A ever.", "medium"),
    dq(4, "Competing bidder was:", "Twitter (~$525m)", ["Disney", "Kraft", "Anbang"], "Zuckerberg moved in a weekend.", "medium"),
    dq(4, "Negotiation took about:", "5 days", ["2 years", "55 days", "1 hour"], "CEO-to-CEO bilateral.", "hard"),
    # Deal 5 Kraft-Cadbury
    dq(5, "Kraft-Cadbury final value:", "$19.5bn", ["$9.7bn", "$26.2bn", "$71.3bn"], "Closed Feb 2010.", "easy"),
    dq(5, "Cadbury premium to pre-bid:", "About 50%", ["10%", "20%", "5%"], "From ~560p to 840p.", "medium"),
    dq(5, "Deal made Cadbury urgent because:", "Mars-Wrigley left it last major target", ["IPO requirement", "Bank bailout", "Poison pill"], "Mars-Wrigley $23bn 2008.", "medium"),
    dq(5, "Somerdale controversy:", "Plant closure after promise to keep open", ["Failed IPO", "Antitrust block", "Currency hedge"], "Changed UK takeover politics.", "medium"),
    dq(5, "Post-deal structure:", "Mondelez spin-off 2012", ["Immediate success", "No change", "Government ownership"], "Admitted portfolio mismatch.", "hard"),
    dq(5, "Cadbury India value:", "70%+ share in some segments", ["No presence", "5% only", "UK only"], "Key strategic prize.", "medium"),
    dq(5, "Bid began as:", "Hostile then recommended", ["Friendly day one", "Government order", "MBO"], "PUSU 28-day clock.", "medium"),
    dq(5, "Buffett (largest Kraft SH):", "Voted against the deal", ["Led the bid", "Bought Cadbury", "Ignored vote"], "Hubris warning on day one.", "hard"),
    # Deal 6 Disney-Fox
    dq(6, "Disney-Fox final price:", "$71.3bn", ["$52.4bn", "$13.7bn", "$85bn only"], "Closed March 2019.", "easy"),
    dq(6, "Murdoch kept:", "Fox News and Fox Sports", ["X-Men and Avatar", "Star India", "Hulu control"], "New Fox Corporation.", "medium"),
    dq(6, "Comcast counterbid was:", "$65bn all-cash", ["$19.5bn", "$1bn", "$200bn"], "Forced Disney to raise offer.", "medium"),
    dq(6, "Sector driver:", "Streaming and IP scarcity", ["Rising cable subs", "Bank consolidation", "IPO wave"], "Netflix disruption.", "medium"),
    dq(6, "Deal initiated by:", "Iger called Murdoch directly", ["Public auction", "Hostile tender", "Court order"], "CEO-to-CEO friendly.", "easy"),
    dq(6, "Shareholders could elect:", "Cash or Disney stock", ["Debt only", "No choice", "Earn-out only"], "51% chose cash (oversubscribed).", "hard"),
    dq(6, "Disney gained Hulu stake to:", "About 60% control", ["0%", "100% forced", "10% only"], "Streaming strategy.", "medium"),
    # Deal 7 Marriott-Starwood
    dq(7, "Marriott-Starwood closed:", "September 2016", ["2012", "2021", "2008"], "Signed Nov 2015.", "easy"),
    dq(7, "Combined properties:", "About 5,700 hotels", ["500", "50", "20,000"], "1.1m rooms globally.", "easy"),
    dq(7, "SPG mattered because:", "50% of Starwood room nights", ["It owned airlines", "No members", "Was shut down"], "Loyalty moat vs OTAs.", "medium"),
    dq(7, "Anbang bid forced:", "Higher Marriott offer", ["Deal cancellation", "IPO", "Government takeover"], "Chinese consortium Mar 2016.", "medium"),
    dq(7, "Both firms are:", "Asset-light (franchise/management)", ["Real estate owners", "OTAs", "Airlines"], "Fee-based hotel model.", "medium"),
    dq(7, "Process started when Starwood:", "Hired Lazard for strategic review", ["Was nationalised", "Filed bankruptcy", "IPO'd"], "Sell-side mandate Apr 2015.", "hard"),
    dq(7, "Starwood data breach (2018):", "DD failure; 500m guests exposed", ["Boosted synergies", "Caused IPO", "Triggered poison pill"], "Cyber DD lesson.", "hard"),
    # Deal 8 VW-Porsche
    dq(8, "Outcome of saga:", "VW absorbed Porsche AG", ["Porsche bought VW fully", "Toyota acquired both", "IPO only"], "Reverse takeover.", "easy"),
    dq(8, "Porsche options debt was about:", "EUR 14bn", ["EUR 700m", "Zero", "$26.2bn"], "GFC froze refinancing.", "medium"),
    dq(8, "VW rescue loan to Porsche:", "EUR 700m (Mar 2009)", ["EUR 14bn", "$1bn", "Zero"], "Power flipped to VW.", "medium"),
    dq(8, "Porsche SE still holds:", "~50.7% VW voting rights", ["0%", "100% of Porsche AG ops", "Toyota stake"], "Family control paradox.", "medium"),
    dq(8, "Oct 2008 event:", "VW short squeeze on stake disclosure", ["Instagram IPO", "Bankia bailout", "Tiffany suit"], "74.1% effective stake revealed.", "hard"),
    dq(8, "Porsche RoE vs VW (~2005):", "22.8% vs 3.0%", ["Equal", "VW higher", "Both zero"], "Drove options strategy.", "hard"),
    dq(8, "Deal type label:", "Reverse takeover / family saga", ["Friendly scale merger", "IPO carve-out", "Hostile UK bid"], "Bidder became target.", "medium"),
    # Deal 9 LVMH-Tiffany
    dq(9, "LVMH-Tiffany total value:", "$15.8bn", ["$1bn", "$3.2bn", "$71.3bn"], "Closed Jan 2021.", "easy"),
    dq(9, "Final price per share:", "$131.50", ["$98", "$196", "$42"], "Renegotiated from $135.", "medium"),
    dq(9, "Strategic gap filled:", "Watches & Jewellery vs Cartier", ["Fashion only", "Wine only", "Airlines"], "8% vs Richemont competition.", "medium"),
    dq(9, "2020 dispute:", "LVMH tried to withdraw; Tiffany sued", ["EU blocked deal", "Stock-only failure", "Hostile bid"], "Renegotiated price cut.", "medium"),
    dq(9, "Financing at close:", "All-cash (bonds + reserves)", ["All-stock", "Earn-out only", "Seller loan"], "EUR 10bn bonds + EUR 5bn cash.", "easy"),
    dq(9, "Integration template:", "Bulgari playbook (2011)", ["Kraft-Cadbury model", "Nokia merge", "No prior deals"], "Globalise jewellery house.", "hard"),
    dq(9, "Initial rejected offer:", "$120/share", ["$131.50", "$196", "$42"], "Signed later at $135.", "hard"),
    # Cross-deal
    dq(0, "Primarily SCALE deals:", "CaixaBank-Bankia + Marriott-Starwood", ["Instagram + LinkedIn", "WFM + Tiffany only", "Porsche + Instagram"], "Same industry cost synergies.", "medium"),
    dq(0, "All-cash deals include:", "MS-LinkedIn, Amazon-WFM, LVMH-Tiffany", ["CaixaBank-Bankia only", "Kraft-Cadbury only", "All nine deals"], "Cash for certainty.", "medium"),
    dq(0, "Hostile-to-friendly:", "Kraft-Cadbury", ["Disney-Fox", "MS-LinkedIn", "LVMH-Tiffany"], "UK takeover battle 2009-10.", "hard"),
    dq(0, "Largest deal in set:", "Disney-Fox ($71.3bn)", ["Instagram", "CaixaBank", "Kraft"], "Media mega-deal 2019.", "easy"),
    dq(0, "Best M&A ROI historically:", "Facebook-Instagram", ["Kraft-Cadbury", "Bankia merger", "Somerdale"], "$715m to $32bn+ revenue.", "medium"),
    dq(0, "Reverse takeover example:", "VW-Porsche", ["MS-LinkedIn", "Marriott-Starwood", "LVMH-Tiffany"], "Intended acquirer became target.", "medium"),
    dq(0, "Badwill / negative goodwill:", "CaixaBank-Bankia", ["Instagram", "Disney-Fox", "Amazon-WFM"], "Buy below book in banking.", "hard"),
    dq(0, "Federated integration success:", "Microsoft-LinkedIn", ["Kraft-Cadbury", "Amazon-WFM day one", "Nokia repeat"], "Preserved brand and CEO.", "medium"),
    dq(0, "MAC / pandemic renegotiation:", "LVMH-Tiffany", ["MS-LinkedIn", "Instagram", "VW-Porsche"], "Sep 2020 withdrawal attempt.", "hard"),
    dq(0, "Bidding war raised price:", "Disney-Fox and Marriott-Starwood", ["Instagram only", "Bankia only", "None"], "Comcast and Anbang interlopers.", "medium"),
]

QUESTIONS.extend(DEALS)

# ========== DEAL EVALUATION & SIZE QUESTIONS ==========
DEAL_META = [
    (1, "Microsoft · LinkedIn", "$26.2bn", 26.2, "Strong", "Successful acquisition with federated integration"),
    (2, "CaixaBank · Bankia", "€4.3bn eq.", 4.3, "Moderate", "Scale logic sound; integration still underway"),
    (3, "Amazon · Whole Foods", "$13.7bn", 13.7, "Moderate", "Strategic win; financial ROI less clear"),
    (4, "Facebook · Instagram", "~$1bn", 1.0, "Exceptional", "Among the best M&A investments ever"),
    (5, "Kraft · Cadbury", "$19.5bn", 19.5, "Mixed", "Hubris, Somerdale, Mondelez spin-off"),
    (6, "Disney · Fox", "$71.3bn", 71.3, "Strong", "Disney+ and Hulu strategy executed"),
    (7, "Marriott · Starwood", "~$13.6bn", 13.6, "Moderate", "Scale achieved; integration complexity"),
    (8, "VW · Porsche", "€8.36bn", 8.36, "Mixed", "Forced reversal; family saga not clean success"),
    (9, "LVMH · Tiffany", "$15.8bn", 15.8, "Strong", "Record revenue; Bulgari playbook worked"),
]

SUCCESS_OPTIONS = ["Exceptional", "Strong", "Moderate", "Mixed"]

def build_deal_eval_questions():
    out = []
    by_id = {d[0]: d for d in DEAL_META}
    for did, name, value, vsort, success, note in DEAL_META:
        wrong_s = [s for s in SUCCESS_OPTIONS if s != success][:3]
        out.append(q(
            f"How successful was the {name} acquisition (course verdict)?",
            success, wrong_s,
            f"Course rates this deal as {success}: {note}.",
            "medium", deal=did,
        ))
        if success in ("Mixed", "Moderate"):
            verdict = "Mixed / partly successful"
            wrong_v = ["Clear failure with no strategic upside", "Exceptional home-run success", "Strong unqualified success"]
        elif success == "Exceptional":
            verdict = "Outstanding success"
            wrong_v = ["Mixed outcome", "Strategic failure", "Moderate success only"]
        else:
            verdict = "Successful acquisition"
            wrong_v = ["Clear failure", "Mixed / disappointing outcome", "Pre-revenue write-off"]
        out.append(q(
            f"Overall, was {name} a good deal for the acquirer?",
            verdict, wrong_v,
            f"{note} Compare table success rating: {success}.",
            "medium", deal=did,
        ))
        other_vals = [v for _, _, v, _, _, _ in DEAL_META if v != value][:3]
        while len(other_vals) < 3:
            other_vals.append("$71.3bn")
        out.append(q(
            f"What was the total acquisition value of {name}?",
            value, other_vals[:3],
            f"{name} closed at approximately {value}.",
            "easy", deal=did,
        ))
    # Size ranking / comparison — options are deal names only (no $ values; that would give away the answer)
    ranked = sorted(DEAL_META, key=lambda x: -x[3])
    out.append(q(
        "Which deal had the highest total acquisition value?",
        ranked[0][1],
        [ranked[1][1], ranked[2][1], ranked[-1][1]],
        f"Disney · Fox at $71.3bn is the largest in the case set.",
        "easy", deal=0,
    ))
    out.append(q(
        "Which deal was the smallest by total value?",
        ranked[-1][1],
        [ranked[0][1], ranked[1][1], ranked[2][1]],
        f"Facebook · Instagram at ~$1bn is the smallest headline deal.",
        "easy", deal=0,
    ))
    out.append(q(
        "Which deals are valued above $25bn?",
        "Microsoft · LinkedIn and Disney · Fox",
        [
            "Kraft · Cadbury and Facebook · Instagram",
            "Amazon · Whole Foods and CaixaBank · Bankia",
            "Marriott · Starwood and VW · Porsche",
        ],
        "Only Microsoft · LinkedIn and Disney · Fox exceed $25bn in the case set.",
        "medium", deal=0,
    ))
    mixed_deals = [n for _, n, _, _, s, _ in DEAL_META if s == "Mixed"]
    strong_deals = [n for _, n, _, _, s, _ in DEAL_META if s in ("Strong", "Exceptional")]
    out.append(q(
        "Which deals are rated Mixed outcome in the course?",
        "Kraft · Cadbury and VW · Porsche",
        ["Microsoft · LinkedIn and Disney · Fox", "Instagram and LVMH · Tiffany", "CaixaBank · Bankia and Marriott · Starwood"],
        "Kraft-Cadbury (Mondelez spin) and VW-Porsche (forced saga) are mixed.",
        "medium", deal=0,
    ))
    out.append(q(
        "Which deals are rated Strong or Exceptional?",
        "Instagram, LinkedIn, Disney · Fox, and LVMH · Tiffany",
        ["Kraft · Cadbury and VW · Porsche only", "Bankia and WFM only", "All nine equally"],
        "Exceptional: Instagram. Strong: LinkedIn, Disney-Fox, Tiffany.",
        "hard", deal=0,
    ))
    out.append(q(
        "Deals valued between $13bn and $16bn include:",
        "Amazon · Whole Foods, Marriott · Starwood, and LVMH · Tiffany",
        [
            "Facebook · Instagram and CaixaBank · Bankia",
            "Disney · Fox and Facebook · Instagram",
            "Microsoft · LinkedIn only",
        ],
        "Whole Foods $13.7bn, Marriott ~$13.6bn, Tiffany $15.8bn fall in that band.",
        "medium", deal=0,
    ))
    return out

QUESTIONS.extend(build_deal_eval_questions())

def js_string(s):
    return json.dumps(s, ensure_ascii=False)

def emit_questions(questions):
    lines = ["const ALL_QUESTIONS = ["]
    for item in questions:
        parts = []
        if "deal" in item:
            parts.append(f"deal: {item['deal']}")
        if "lecture" in item:
            parts.append(f"lecture: {item['lecture']}")
        parts.append(f"difficulty: {js_string(item['difficulty'])}")
        parts.append(f"text: {js_string(item['text'])}")
        opts = ", ".join(js_string(o) for o in item["options"])
        parts.append(f"options: [{opts}]")
        parts.append(f"correct: {item['correct']}")
        parts.append(f"explanation: {js_string(item['explanation'])}")
        parts.append(f"explanationDetail: {js_string(item['explanationDetail'])}")
        lines.append("  { " + ", ".join(parts) + " },")
    lines.append("];")
    return "\n".join(lines)

def check_balance(questions):
    longest = shortest = 0
    rank_counts = [0, 0, 0, 0]
    total = len(questions)
    for item in questions:
        opts = item["options"]
        ci = item["correct"]
        lens = [len(o) for o in opts]
        mx = max(lens)
        mn = min(lens)
        if lens[ci] == mx:
            longest += 1
        if lens[ci] == mn:
            shortest += 1
        ranks = sorted(range(4), key=lambda i: lens[i])
        rank_counts[ranks.index(ci)] += 1
    return total, longest, shortest, rank_counts

if __name__ == "__main__":
    total, longest, shortest, ranks = check_balance(QUESTIONS)
    print(f"Questions: {total}")
    print(f"Correct is longest: {longest} ({100*longest/total:.1f}%)")
    print(f"Correct is shortest: {shortest} ({100*shortest/total:.1f}%)")
    print(f"Correct length rank distribution (0=shortest): {ranks}")

    out = os.path.join(os.path.dirname(__file__), "..", "js", "quiz-data.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(emit_questions(QUESTIONS) + "\n")
    print(f"Wrote {out}")
