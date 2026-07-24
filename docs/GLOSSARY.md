# Glossary

Domain and product terminology. Anything appearing in the UI should be defined here in language a non-accountant can follow.

## Product terms

| Term | Definition |
| --- | --- |
| **Analysis** | One complete run of the agent pipeline over one statement. |
| **Agent** | A single-responsibility stage in the pipeline with a typed input and output. |
| **AgentRun** | The append-only audit record of one agent execution. |
| **Confidence** | 0–1 measure of how much the data supports a conclusion. Propagates from validation through to the report. |
| **Degraded analysis** | A completed analysis with valid metrics but no AI narrative, typically because the model was unavailable. |
| **Financial Health Score** | 0–100 composite across five weighted pillars. |
| **Funding readiness** | Indicative assessment of how a lender would view the business. Not a credit decision. |
| **Pillar** | One of five weighted score components. |
| **Statement** | An uploaded bank export and its validation outcome. |
| **Underwriting profile** (Phase 3) | Standardised, consent-shared, cash-flow-derived profile for lenders. |

## Financial terms

| Term | Definition |
| --- | --- |
| **Burn rate** | Average monthly amount by which outflow exceeds inflow. |
| **Cash flow** | Actual movement of money in and out. Distinct from profit. |
| **Coefficient of variation (CV)** | Standard deviation ÷ mean. Measures relative variability; comparable across businesses of different sizes. |
| **Concentration** | How much income depends on a small number of customers. |
| **Days cash on hand** | Liquid buffer ÷ average daily outflow. |
| **Discretionary spend** | Costs the business could cut quickly without ceasing to operate. |
| **Drawdown** | Largest peak-to-trough fall in balance over the period. |
| **Fixed cost coverage** | Average revenue ÷ average fixed obligations. Above 1.0 means fixed costs are covered. |
| **HHI** | Herfindahl–Hirschman Index — sum of squared customer shares. Higher means more concentrated. |
| **Internal transfer** | Movement between the owner's own accounts. Not revenue and not expense; counting it as either is the classic way to overstate a small business's health. |
| **Liquid buffer** | Cash actually available, approximated from account balance. |
| **Operating leverage (as used here)** | Revenue growth rate minus expense growth rate. Positive means the business is getting more efficient. |
| **Overdraft event** | A day on which the account balance was negative. |
| **Recurring series** | A repeating transaction pattern — rent, subscription, retainer, loan repayment. |
| **Returned payment / NSF** | A payment that failed for insufficient funds. A strong negative credit signal. |
| **Runway** | Months the business can operate at current burn before cash runs out. |
| **Seasonality** | Predictable annual variation in revenue. Predictable is not the same as unstable. |
| **Structural break** | A step change in a series level, as opposed to gradual drift. Often a lost client or a new contract. |

## Abbreviations

| | |
| --- | --- |
| **MSME** | Micro, Small and Medium Enterprise |
| **DSO** | Days Sales Outstanding |
| **CV** | Coefficient of Variation |
| **HHI** | Herfindahl–Hirschman Index |
| **NSF** | Non-Sufficient Funds |
| **pp** | Percentage points |
| **ADR** | Architecture Decision Record |
| **SSE** | Server-Sent Events |
