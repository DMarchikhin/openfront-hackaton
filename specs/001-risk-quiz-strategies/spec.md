# Feature Specification: Risk Quiz & Investment Strategies

**Feature Branch**: `001-risk-quiz-strategies`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Build an application with super simple quiz that will help us to choose what pools we can invest according to users risk level. App shows different strategies and user just use one and we start investing with an agent"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Take Risk Assessment Quiz (Priority: P1)

A new user opens the app and is presented with a short, friendly quiz
(3-5 questions) that assesses their risk tolerance. Questions are
simple, non-technical, and use plain language (e.g., "How would you
feel if your balance dropped 10% temporarily?" with emoji-style
answer options). After completing the quiz, the user is assigned a
risk profile: Conservative, Balanced, or Growth.

**Why this priority**: The quiz is the entry point to the entire
experience. Without knowing the user's risk level, no strategy can
be recommended. This is the foundation for all other stories.

**Independent Test**: Can be fully tested by completing the quiz
and verifying a risk profile is assigned. Delivers value by giving
users self-awareness of their investment personality.

**Acceptance Scenarios**:

1. **Given** a user opens the app for the first time, **When** they
   land on the home screen, **Then** they see a prompt to take the
   risk assessment quiz.
2. **Given** a user starts the quiz, **When** they answer all
   questions, **Then** they see their assigned risk profile
   (Conservative, Balanced, or Growth) with a brief explanation of
   what it means.
3. **Given** a user is answering the quiz, **When** they are on any
   question, **Then** they see a progress indicator showing how many
   questions remain.
4. **Given** a user has completed the quiz, **When** they view their
   result, **Then** they see a clear label, a short description of
   their risk profile, and a call-to-action to view strategies.

---

### User Story 2 - View Recommended Strategies (Priority: P2)

After completing the quiz, the user sees a set of investment
strategies tailored to their risk profile. Each strategy card
displays a name, a brief description, the target Aave pools and
chains, the expected APY range, and a visual risk indicator. The
strategy recommended for their profile is highlighted, but the
user can browse all strategies.

**Why this priority**: Showing strategies is the direct payoff
of the quiz. Users need to understand their options before
committing funds.

**Independent Test**: Can be tested by completing the quiz and
verifying strategies are displayed with accurate pool details
and APY ranges. Delivers value by educating users on available
yield opportunities matched to their comfort level.

**Acceptance Scenarios**:

1. **Given** a user has a risk profile assigned, **When** they
   navigate to the strategies screen, **Then** they see at least
   three strategies (one per risk level: Conservative, Balanced,
   Growth) with the one matching their profile highlighted.
2. **Given** a user is viewing strategies, **When** they look at
   any strategy card, **Then** they see: strategy name, short
   description, expected APY range, risk level indicator, and
   which chain(s)/pool(s) are involved.
3. **Given** a user has a Conservative profile, **When** they view
   strategies, **Then** the Conservative strategy is pre-selected
   and visually emphasized, but Balanced and Growth are still
   accessible.
4. **Given** a user taps on a strategy card, **When** the detail
   view opens, **Then** they see a breakdown of pool allocations
   (e.g., "80% Aave USDC on Ethereum, 20% Aave USDC on Base")
   and a simple explanation of why this allocation matches the
   risk level.

---

### User Story 3 - Select Strategy & Start Investing (Priority: P3)

The user selects a strategy and confirms they want to start
investing. They deposit USDC (or confirm existing balance), and
the AI agent begins autonomous investing according to the chosen
strategy's parameters (pool allocation, chain preferences,
rebalance thresholds). The user sees a confirmation screen and
their dashboard updates to reflect the active strategy.

**Why this priority**: This is the conversion moment — turning
a quiz result into actual investment. Depends on the quiz (P1)
and strategy display (P2) being functional.

**Independent Test**: Can be tested by selecting a strategy,
confirming investment, and verifying the agent starts executing
according to the strategy rules. Delivers value by putting money
to work automatically.

**Acceptance Scenarios**:

1. **Given** a user is viewing a strategy, **When** they tap
   "Start Investing", **Then** they see a confirmation screen
   showing: strategy name, expected APY range, and a deposit
   prompt (if no funds in wallet).
2. **Given** a user confirms their strategy selection, **When**
   the system processes the request, **Then** the AI agent is
   configured with the strategy's parameters (target pools,
   allocation percentages, allowed chains, rebalance threshold)
   and begins investing.
3. **Given** a user has started investing with a strategy, **When**
   they return to the dashboard, **Then** they see their active
   strategy name, current balance, live APY, and daily earnings
   estimate.
4. **Given** a user has an active strategy, **When** the agent
   makes a rebalance decision, **Then** the decision respects
   the strategy's pool allocation rules and risk constraints.

---

### User Story 4 - Change Strategy (Priority: P4)

A user who already has an active strategy decides to change their
risk preference. They can retake the quiz or directly browse and
select a different strategy. The agent transitions funds to match
the new strategy's allocation rules.

**Why this priority**: Important for retention but not required
for initial launch. Users need to feel they are not locked in.

**Independent Test**: Can be tested by switching from one active
strategy to another and verifying funds are reallocated to match
the new strategy. Delivers value by giving users ongoing control.

**Acceptance Scenarios**:

1. **Given** a user has an active strategy, **When** they tap
   "Change Strategy" in settings or dashboard, **Then** they can
   either retake the quiz or browse all strategies directly.
2. **Given** a user selects a new strategy, **When** they confirm
   the switch, **Then** they see a summary of what will change
   (old strategy vs. new, expected APY change) and must confirm.
3. **Given** a user confirms a strategy change, **When** the agent
   processes the switch, **Then** funds are reallocated to match
   the new strategy's target pools and allocation percentages.

---

### Edge Cases

- What happens when Aave pool rates change dramatically after a
  strategy is selected? The agent rebalances within the strategy's
  allowed pools and constraints, not outside them.
- What happens when a user has zero balance and selects a strategy?
  They see a deposit prompt before the agent can begin investing.
- What happens when a selected strategy's target pool is
  temporarily unavailable? The agent holds funds in the next-best
  pool within the same risk tier until the preferred pool recovers.
- What happens when a user abandons the quiz midway? Their progress
  is not saved; they restart from question 1 next time.
- What happens when all strategies show similar APY ranges? The
  strategies still differ in pool diversification and chain
  preferences; the UI clarifies the trade-offs beyond just APY.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present a risk assessment quiz of 3-5
  questions with pre-defined answer options (no free-text input).
- **FR-002**: System MUST calculate a risk profile (Conservative,
  Balanced, or Growth) based on quiz answers using a simple
  scoring model.
- **FR-003**: System MUST display at least three investment
  strategies, one per risk profile level, each with name,
  description, expected APY range, risk indicator, and pool
  allocation details.
- **FR-004**: System MUST allow the user to select any strategy
  regardless of their quiz result (quiz recommends, user decides).
- **FR-005**: System MUST configure the AI agent with the selected
  strategy's parameters (target pools, allocation percentages,
  allowed chains, rebalance threshold) upon user confirmation.
- **FR-006**: System MUST display real-time dashboard data (balance,
  active strategy, current APY, earnings) once investing begins.
- **FR-007**: System MUST allow users to change their active
  strategy at any time, triggering a fund reallocation.
- **FR-008**: System MUST persist the user's risk profile and
  selected strategy across sessions.
- **FR-009**: Strategy pool allocations MUST respect the
  constitution's security constraints (whitelisted contracts only,
  Openfort policy enforcement).
- **FR-010**: All strategy descriptions and quiz questions MUST use
  plain, non-technical language with no DeFi jargon.

### Key Entities

- **Risk Profile**: Represents a user's risk tolerance level
  (Conservative, Balanced, Growth). Derived from quiz answers.
  Attributes: level, description, score range.
- **Investment Strategy**: A named configuration for the AI agent.
  Attributes: name, risk level, description, target pools (with
  chain and protocol), allocation percentages, expected APY range,
  rebalance threshold, allowed chains.
- **Quiz Question**: A single assessment question with pre-defined
  answer options. Attributes: question text, display order, answer
  options (each with label and score weight).
- **User Strategy Selection**: The binding between a user and their
  chosen strategy. Attributes: user reference, selected strategy,
  activation date, status (active/inactive).

## Assumptions

- The quiz uses a simple additive scoring model: each answer has
  a numeric weight, total score maps to a risk profile tier.
- Strategies are pre-defined (not dynamically generated); the
  initial set includes three strategies matching the three risk
  levels.
- APY ranges displayed are indicative and fetched from live Aave
  pool data where possible; they are not guaranteed returns.
- The AI agent is already capable of executing transactions via
  Openfort (as described in the product definition); this feature
  configures its behavior, not its core transaction ability.
- Gasless transactions via Openfort Paymaster are assumed for all
  user-facing operations.
- Testnet (Base Sepolia) is the target environment for development
  and demo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users complete the risk assessment quiz in under
  60 seconds.
- **SC-002**: 90% of users who start the quiz finish it without
  abandoning.
- **SC-003**: Users can go from quiz completion to active investing
  in under 3 minutes (including deposit if needed).
- **SC-004**: The strategies screen loads and displays all options
  within 2 seconds of navigation.
- **SC-005**: 100% of agent investment actions comply with the
  selected strategy's pool and chain constraints.
- **SC-006**: Users can switch strategies and see funds begin
  reallocation within 30 seconds of confirmation.
