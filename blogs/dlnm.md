---
title: "Clauding around Academic Open Source Libraries"
slug: "contributing-to-academic-oss"
date: 2026-04-01
updated: 2026-04-01
description: "Using Claude to contribute to epidemiology libraries."
tags:
  - OSS
  - Claude
draft: true
featured: false
toc: true
reading_time: 5
---

## Introduction

Like most good things, this started off with a serindipitous conversation during a ski trip. I was asking my biostats PhD friend what they would be working on at the epidemiology lab that they were joining in a few months. They explained the challenges related to how much data was captured by health systems and the modeling techniques used to extract conclusions from that data. I was then introduced to [distributed lag non-linear models](http://www.ag-myresearch.com/package-dlnm.html) (DLNM). The sense I got was these statisticians are developing statistical techniques in order to get better outcomes from this data. My tech bro monkey brain was curious if there were some low hanging fruit from a engineering side that would also help. The rest of this post breaks down what this library does and lists potential optimizations I found, as well as benchmarks for evaluating those optimizations against the status quo.  


## DLMN

This model is used in epidemiology studies. It takes a dataset like the example below and tries to answer the question, given the temperature has been hot in the last five days, does the number of deaths go up? The challenge here is that we need to consider all temperatures in the past to a certain look back date and also understand that there could be a non-linear relationship between the temperatures and the look back date. For example, the temp going up 20 degrees from 100 to 120 is a lot more impactful than going from 50 to 70. And it could be the case that it takes minimum 5 days for an effect to occur on the population. Both of these are non-linear relationships that DLNM tries to capture.

```
        date  time  year  month  doy       dow   death   temp    pm10
  1987-01-01     1  1987      1    1  Thursday    130   -0.28   26.96
  1987-01-02     2  1987      1    2    Friday    150    0.56      NA
  1987-01-03     3  1987      1    3  Saturday    101    0.56   32.84
```

In the DLMN library there are two main steps. Transforming the data into a "crossbasis matrix" and fitting the data using a R's glm(). Generating the crossbasis matrix involves first decompsing the depedent variable like temp and the lag date into several basis functions. Then for a given row you take the tensor product of the corresponding. For example, if you decompose the temp into 4 basis functions and lag into 5 basis function. So if you have a 20 day look back window. Then for every row you have 20 temps, each of those temps gets broken down into 4 temp basis functions and then for every lag (0 to 20) you have 5 lag basis functions. you then do a tensor product.


```r
crossbasis <- matrix(0, nrow=dim[1], ncol=ncol(basisvar)*ncol(basislag))
for(v in seq(length=ncol(basisvar))) {
    mat <- as.matrix(Lag(basisvar[, v], seqlag(lag)))
    for(l in seq(length=ncol(basislag))) {
      crossbasis[, ncol(basislag)*(v-1)+l] <- mat %*% basislag[,l]
    }
}
```

```
day	temp	death
1	-2°	130
2	5°	142
3	12°	118
4	20°	105
5	28°	110
6	15°	115
7	8°	135
8	3°	148
```

```
Each temp is fed through 2 functions → 2 columns. Same number in = same 2 numbers out.
day	temp		B1(temp)	B2(temp)
1	-2° 	0.05	0.90
2	5°		0.22	0.70
3	12°		0.48	0.42
4	20°		0.72	0.18
5	28°		0.91	0.04
6	15°		0.55	0.38
7	8°		0.30	0.62
8	3°		0.15	0.78
```

```
Shift each basis column back by 0, 1, and 2 days. Days 1–2 lose rows (not enough history).
B1 lagged → mat_B1 (6 rows x 3 lags)
lag0	lag1	lag2
day 3	0.48	0.22	0.05
day 4	0.72	0.48	0.22
day 5	0.91	0.72	0.48
day 6	0.55	0.91	0.72
day 7	0.30	0.55	0.91
day 8	0.15	0.30	0.55
B2 lagged → mat_B2 (6 rows x 3 lags)
lag0	lag1	lag2
day 3	0.42	0.70	0.90
day 4	0.18	0.42	0.70
day 5	0.04	0.18	0.42
day 6	0.38	0.04	0.18
day 7	0.62	0.38	0.04
day 8	0.78	0.62	0.38
```

```
Step 4 — crossbasis (the final matrix fed to the GLM)
2 temp basis x 2 lag basis = 4 columns. Each cell = dot product of a lagged row with a lag basis column.
death	v1.l1	v1.l2	v2.l1	v2.l2
day 3	118	0.464	0.203	0.626	1.202
day 4	105	0.755	0.510	0.326	0.858
day 5	110	1.004	0.883	0.116	0.472
day 6	115	0.795	1.158	0.327	0.220
day 7	135	0.478	1.124	0.631	0.288
day 8	148	0.253	0.660	0.860	0.730
```









## Solution

Your first major point or argument. Use subheadings if this section is long.

## Benchmarks

Break complex ideas into digestible chunks.

## Conclusion/Future work 

Your second major point. Support claims with examples, data, or quotes.

```language
# Include code blocks where relevant
print("hello world")
```

## Main Section 3

Continue building your narrative. Consider using visuals:

![Alt text for image](/images/posts/example.png "Optional tooltip")

> Use blockquotes to highlight key takeaways or external references.

## Practical Takeaways

Distill the post into actionable advice or a numbered list of key points the reader can walk away with.

## Conclusion

Summarize the core message, restate why it matters, and include a call to action — ask a question, link to related posts, or invite comments.

---

*Have thoughts on this? [Get in touch](mailto:you@example.com) or leave a comment below.*
