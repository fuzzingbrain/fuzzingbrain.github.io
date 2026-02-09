<p align="center">
  <img src="assets/images/fuzzbrain.jpg" alt="FuzzingBrain" width="128">
</p>

<h1 align="center">FuzzingBrain</h1>

<p align="center">
  <strong>LLM-Powered Autonomous Vulnerability Detection and Patching</strong><br>
  4th Place, DARPA AI Cyber Challenge (AIxCC)
</p>

<p align="center">
  <a href="https://fuzzingbrain.github.io">Website</a> &middot;
  <a href="https://github.com/o2lab/afc-crs-all-you-need-is-a-fuzzing-brain">Source Code</a> &middot;
  <a href="https://fuzzingbrain.github.io/FuzzingBrain-Leaderboard/">LLM Leaderboard</a> &middot;
  <a href="https://fuzzingbrain.github.io/blog.html">Blog</a>
</p>

---

This repository hosts the **[fuzzingbrain.github.io](https://fuzzingbrain.github.io)** website -- the research blog and documentation site for the FuzzingBrain project.

FuzzingBrain is an autonomous Cyber Reasoning System (CRS) that uses 23 LLM-based strategies across multiple frontier models to discover and patch vulnerabilities without human intervention. It was developed at Texas A&M University and placed **4th in DARPA's AI Cyber Challenge**.

## Key Results

| | |
|---|---|
| **62** | zero-day vulnerabilities discovered across 26 major open source projects |
| **36** | patches already merged upstream |
| **23** | distinct LLM-based strategies for vulnerability detection and patching |
| **~100** | VMs orchestrated in parallel during competition |

Affected projects include CUPS, UPX, Apache Avro, Apache PDFBox, BlueZ, fwupd, GraalJS, simdutf, Mongoose, Ghidra, ImageMagick, and more.

## What's on the Site

**Blog posts** covering our technical approach and results:

- [Zero-Day Vulnerability Discoveries](https://fuzzingbrain.github.io/posts/zero-day-vulnerability-discoveries.html) -- Full report on 62 vulnerabilities across 26 projects
- [AIxCC Final Achievements](https://fuzzingbrain.github.io/posts/aixcc-final-achievements.html) -- Our competition results and lessons learned
- [23 Strategy Arsenal](https://fuzzingbrain.github.io/posts/llm-powered-fuzzing-23-strategy-arsenal.html) -- Deep dive into our LLM-powered strategy system
- [Scaling to 100 VMs](https://fuzzingbrain.github.io/posts/scaling-to-100-vms-parallel-architecture.html) -- Parallel architecture design
- [FuzzingBrain Leaderboard](https://fuzzingbrain.github.io/posts/fuzzingbrain-leaderboard.html) -- Benchmarking LLMs on security tasks
- [Claude Code Demo](https://fuzzingbrain.github.io/posts/claude-code-aixcc-demo.html) -- Walkthrough of AI-assisted vulnerability analysis

**Documentation** on system internals: strategy overview, PoV generation, patch strategies, SARIF processing, and task orchestration.

## Project Structure

```
index.html              Landing page
blog.html               Blog index
documentation.html      Documentation hub
quickstart.html         Getting started guide
posts/                  Blog post pages
docs/                   Technical documentation pages
styles.css              Shared stylesheet
script.js               Shared JavaScript
assets/                 Images and static assets
_config.yml             GitHub Pages configuration
```

## Related Repositories

- **[CRS Source Code](https://github.com/o2lab/afc-crs-all-you-need-is-a-fuzzing-brain)** -- The complete FuzzingBrain Cyber Reasoning System
- **[LLM Leaderboard](https://fuzzingbrain.github.io/FuzzingBrain-Leaderboard)** -- Benchmark comparing frontier LLMs on vulnerability detection and patching

## Research Team

- **Jeff Huang** (Team Lead) -- Texas A&M University
- **Ze Sheng** -- Texas A&M University
- **Qingxiao Xu** -- Texas A&M University
- **Jianwei Huang** -- Texas A&M University
- **Matthew Woodcock** -- Texas A&M University
- **Heqing Huang** -- City University of Hong Kong
- **Alastair F. Donaldson** -- Imperial College London
- **Guofei Gu** -- Texas A&M University
