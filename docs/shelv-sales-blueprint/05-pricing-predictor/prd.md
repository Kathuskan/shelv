# Shelv Pricing Predictor Product Requirements

Version 1.0 | 2 October 2026 | Owner: Shelv founder

Help sellers choose a defensible asking price for a new or used book by showing comparable evidence and, later, a calibrated predicted range. The seller remains responsible for the final price. This component begins as descriptive comparables and becomes a trained predictor only after enough representative completed sales exist.

## Scope and product boundary

The first output is a suggested range in LKR for the item price, excluding delivery and platform charges. Show condition, edition match, comparable count, time window, and whether evidence is strong, limited, or unavailable. A dynamic update means refreshing a suggestion when evidence changes; it does not mean automatically repricing live listings.

New-book pricing and used-book pricing use separate cohorts. A new-book seller's declared cost or list price can constrain their own decision but should not be inferred from used-book sales. Rare editions and unsupported categories receive an insufficient-data result.

## Requirements

- PRC-01: Give a range and evidence basis, never a guaranteed sale price or sale date.
- PRC-02: Distinguish observed asking prices from completed-sale prices. Asking prices cannot be labeled market-clearing values.
- PRC-03: Sellers must explicitly confirm any change to a listing price. Never change prices for reserved or paid orders.
- PRC-04: Use only information available at prediction time. Exclude buyer identity, sensitive personal attributes, and willingness-to-pay targeting.
- PRC-05: Return unavailable when cohort coverage or calibration is inadequate. Do not substitute a confident language-model guess.
- PRC-06: Preserve model version, feature timestamp, evidence count, interval meaning, and generatedAt for each suggestion.

## Data requirements

Use completed, nonfraudulent sales with known edition, condition, currency, item quantity, item amount, listing age, and fulfillment outcome. Define a maturation window so refunds or reversals can be handled before training labels are accepted. Normalize item price per copy; exclude shipping, platform fees, and tax components where separately charged.

Do not treat unsold listings as zero-price sales. Training only on successful sales creates selection bias; disclose that limitation and track unsold inventory separately. Future demand or time-to-sale models need censored-outcome treatment and are outside the first version.

## Baseline and model progression

Start with recent comparable-sale medians by exact edition and condition. If exact matches are sparse, broaden only through an explicit hierarchy such as related edition and format, and disclose the broader basis. Winsorization or outlier exclusion must follow documented rules and retain an audit trail.

The trained version can use a tabular regressor with quantile estimates. Proposed minimum exploration data is 500 mature sales across useful cohorts, but reaching that count does not authorize release. The actual gate is held-out improvement, subgroup coverage, and meaningful interval calibration. For a sparse local marketplace the baseline may remain better for a long time.

## Journey and integration

In the listing editor, the seller confirms edition and condition, then requests a suggestion. Express sends approved features to the predictor and shows the range with supporting comparables. Choosing a price fills the normal editable price field. The subsequent listing update goes through the core API's validation and audit rules.

Completed orders feed future training exports. Recommendation click counts and AI-generated sentiment should not become price features until their reliability and leakage risks have been evaluated.

## Acceptance and measurement

Use chronological train, validation, and final holdout partitions. Report MAE in LKR, median absolute error, error by condition and category, and interval coverage with interval width. Compare against the comparable-median baseline on the same eligible examples. Proposed model release gate: at least a 10 percent MAE improvement without materially worse important cohorts, plus roughly 80 percent coverage for a declared 80 percent prediction interval on a sufficiently sized holdout.

Record uncertainty where subgroup samples are small. Measure seller acceptance, price edits, eventual completion, and days to sale without claiming causality from simple correlations. Run the model in shadow mode first. Price manipulation, fake sales, stale editions, and feedback loops are the main risks.
