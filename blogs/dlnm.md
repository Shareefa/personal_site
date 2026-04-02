---
title: "5x Faster DLNM: Rewriting an Epidemiology Library's Hot Path"
slug: "contributing-to-academic-oss"
date: 2026-04-01
updated: 2026-04-01
description: "How I to optimized an R epidemiology package by rewriting its hot path in Rust."
tags:
  - OSS
  - Claude
  - Rust
  - R
  - Epidemiology
draft: false
featured: false
toc: true
reading_time: 5
---

## Introduction

Like most good things, this started off with a serendipitous conversation during a ski trip. I was asking my biostats PhD friend about their epidemiology lab. They explained the challenges related to how much data was captured by health systems and the modeling techniques used to extract conclusions from that data. I was then introduced to [distributed lag non-linear models](http://www.ag-myresearch.com/package-dlnm.html) (DLNM). I was curious if there were some low hanging fruit from an engineering side that would help and excited by a potential opportunity to contribute to open source software. The rest of this post breaks down what this library does, potential optimizations and benchmarks for evaluation.


## DLNM

This [model](http://www.ag-myresearch.com/uploads/1/3/8/6/13864925/gasparrini_jss2011.pdf) is used in epidemiology studies. It takes a dataset like the example below and tries to answer the question, given the temperature has been hot in the last five days, does the number of deaths go up? The challenge here is that we need to consider all temperatures in the past to a certain look back date and also understand that there could be a non-linear relationship between the temperatures and the look back date. For example, the temp going up 20 degrees from 100 to 120 is a lot more impactful than going from 50 to 70. It could also take several days for the effect to be found. Both of these are non-linear relationships that DLNM tries to capture.

| date | time | year | month | doy | dow | death | temp | pm10 |
|------|------|------|-------|-----|-----|-------|------|------|
| 1987-01-01 | 1 | 1987 | 1 | 1 | Thursday | 130 | -0.28 | 26.96 |
| 1987-01-02 | 2 | 1987 | 1 | 2 | Friday | 150 | 0.56 | NA |
| 1987-01-03 | 3 | 1987 | 1 | 3 | Saturday | 101 | 0.56 | 32.84 |

In the DLNM library there are two main steps. Transforming the data into a "crossbasis matrix" and fitting the data using R's glm(). Generating the crossbasis matrix involves first decomposing the dependent variable like temp and the lag date into several basis functions. Then for a given row you take the tensor product of the corresponding basis vectors. For example, 2 temp basis functions and 2 lag basis functions and a 2 day look back window. Then for every day row you have 3 lagged temps, each of those temps gets broken down into 2 temp basis functions and then for every lag (0 to 2) you have 2 lag basis functions. Then you take a dot product for every temp basis function and lag basis function to construct the cross basis matrix. And then fit your generalized linear model on that. 


```r
crossbasis <- matrix(0, nrow=dim[1], ncol=ncol(basisvar)*ncol(basislag))
for(v in seq(length=ncol(basisvar))) {
    mat <- as.matrix(Lag(basisvar[, v], seqlag(lag)))
    for(l in seq(length=ncol(basislag))) {
      crossbasis[, ncol(basislag)*(v-1)+l] <- mat %*% basislag[,l]
    }
}
```

| day | temp | death |
|-----|------|-------|
| 1 | -2° | 130 |
| 2 | 5° | 142 |
| 3 | 12° | 118 |
| 4 | 20° | 105 |
| 5 | 28° | 110 |
| 6 | 15° | 115 |
| 7 | 8° | 135 |
| 8 | 3° | 148 |

Each temp is fed through 2 functions → 2 columns.

| day | temp | B1(temp) | B2(temp) |
|-----|------|----------|----------|
| 1 | -2° | 0.05 | 0.90 |
| 2 | 5° | 0.22 | 0.70 |
| 3 | 12° | 0.48 | 0.42 |
| 4 | 20° | 0.72 | 0.18 |
| 5 | 28° | 0.91 | 0.04 |
| 6 | 15° | 0.55 | 0.38 |
| 7 | 8° | 0.30 | 0.62 |
| 8 | 3° | 0.15 | 0.78 |

Shift each basis column back by 0, 1, and 2 days. Days 1–2 lose rows (not enough history).

**B1 lagged → mat_B1 (6 rows x 3 lags)**

| | lag0 | lag1 | lag2 |
|-------|------|------|------|
| day 3 | 0.48 | 0.22 | 0.05 |
| day 4 | 0.72 | 0.48 | 0.22 |
| day 5 | 0.91 | 0.72 | 0.48 |
| day 6 | 0.55 | 0.91 | 0.72 |
| day 7 | 0.30 | 0.55 | 0.91 |
| day 8 | 0.15 | 0.30 | 0.55 |

**B2 lagged → mat_B2 (6 rows x 3 lags)**

| | lag0 | lag1 | lag2 |
|-------|------|------|------|
| day 3 | 0.42 | 0.70 | 0.90 |
| day 4 | 0.18 | 0.42 | 0.70 |
| day 5 | 0.04 | 0.18 | 0.42 |
| day 6 | 0.38 | 0.04 | 0.18 |
| day 7 | 0.62 | 0.38 | 0.04 |
| day 8 | 0.78 | 0.62 | 0.38 |

**Step 4 — crossbasis (the final matrix fed to the GLM)**

2 temp basis x 2 lag basis = 4 columns. Each cell = dot product of a lagged row with a lag basis column.

| | death | v1.l1 | v1.l2 | v2.l1 | v2.l2 |
|-------|-------|-------|-------|-------|-------|
| day 3 | 118 | 0.464 | 0.203 | 0.626 | 1.202 |
| day 4 | 105 | 0.755 | 0.510 | 0.326 | 0.858 |
| day 5 | 110 | 1.004 | 0.883 | 0.116 | 0.472 |
| day 6 | 115 | 0.795 | 1.158 | 0.327 | 0.220 |
| day 7 | 135 | 0.478 | 1.124 | 0.631 | 0.288 |
| day 8 | 148 | 0.253 | 0.660 | 0.860 | 0.730 |

## Optimizations

The main bottleneck is that your data set grows by N * lag days * variable basis functions * lag basis functions when you just want N * varbasis function * lag basis functions. If you have a 1GB data set then this already maxes out most consumer hardware. In order to avoid this we just use index arithmetic to pull previous days values. We also use the rayon library to split up the n rows across all cores and process them in parallel.

```r
for (v in 1:ncol(basisvar)) {
  lag_matrix <- Lag(basisvar[, v], lag_range)  # Materializes (n x lag_range) matrix
  for (l in 1:ncol(basislag)) {
    cb[, idx] <- lag_matrix %*% basislag[, l]
    idx <- idx + 1
  }
}
```
```rust
// pseudocode
// parallelized across rows (days)
  for each row i (in parallel):
      for v in 0..nv:
          // gather 22 lagged values directly from basisvar column
          var_vals[j] = basisvar[i - j, v]   // ← no lag matrix, just index arithmetic

          for l in 0..nl:
              // dot product in-place
              sum += var_vals[j] * basislag[j, l]
```

## Benchmarks

| Config | Var Basis | Lag Basis | Lag Range | CB Columns | Purpose |
|--------|-----------|-----------|-----------|------------|---------|
| C1 | `lin` (df=1) | `poly(degree=4)` (df=5) | 0-15 | 5 | Minimal/DLM |
| C2 | `ns(df=5)` | `ns(df=4)` | 0-21 | 20 | Typical epidemiology |

| Scale | Cities | Rows | 
|-------|--------|------|
| 10 MB | 24 | ~123K |
| 100 MB | 235 | ~1.2M | 
| 1 GB | 2,350 | ~12M | 
| 10 GB | 23,500 | ~120M | 


| Scale | Config | R Baseline (sec) | Rust Optimized (sec) |
|-------|--------|-------------------|----------------------|
| 10MB | C1 | 0.032 | 0.034 |
| 10MB | C2 | 0.215 | 0.061 |
| 100MB | C1 | 0.382 | 0.165 |
| 100MB | C2 | 2.147 | 0.630 |
| 1GB | C1 | 4.528 | 0.957 |
| 1GB | C2 | 41.852 | 7.399 |
| 10GB | C1 | — | 18.349 |

| Config | Stage | R Baseline (sec) | Rust Optimized (sec) |
|--------|-------|-------------------|----------------------|
| C1 | crossbasis | 0.382 | 0.165 |
| C1 | glm | 14.598 | 21.094 |
| C1 | crosspred | 0.103 | 0.139 |
| C1 | crossreduce | 0.111 | 0.118 |

| Config | Stage | R Baseline (sec) | Rust Optimized (sec) |
|--------|-------|-------------------|----------------------|
| C2 | crossbasis | 2.147 | 0.630 |
| C2 | glm | 17.667 | 24.312 |
| C2 | crosspred | 0.105 | 0.178 |
| C2 | crossreduce | 0.107 | 0.157 |




## Conclusions

From the benchmarks it seems like our Rust implementation accomplished what it was meant to do, when the dataset gets large it allows the cross-basis matrix to still be formed within my 32 GB memory limits. It also computes it a lot faster than the R implementation. I chose to do this in Rust arbitrarily, which seems like the wrong choice given R's FFI only supports C and C++. I ended up using the extendr crate in order to bridge that interface.

For future work it seems like the GLM function, which is native to R, also takes up the majority of the run time. There is a fastGLM library that we could use as a drop-in to see if that would run faster as well.

There are also optimizations that we could do in terms of fitting the data into the cache optimally. Given we are doing an index lookup of lag_num values making sure that we hit L1 cache could also be a place to optimize.

## Reflections

This is more of an exercise in seeing if I could add value to a domain that I am new to. After cleaning up this repo, I'll forward it to the original [author](http://www.ag-myresearch.com/) and see if we can push an update to this library. I'm interested in hearing any suggestions on better ways to optimize this library. I'm also on the look out similar libraries in the academic open source software space that could be looked at.
