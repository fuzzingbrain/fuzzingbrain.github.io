# All You Need Is A Fuzzing Brain: Our Key Achievements in DARPA's AI Cyber Challenge

*Published: September 2025*

## Introduction

We're thrilled to share the technical details behind our team's success in DARPA's Artificial Intelligence Cyber Challenge (AIxCC). Our team, **All You Need Is A Fuzzing Brain**, achieved 4th place among seven finalists, autonomously discovering **28 security vulnerabilities** including **6 previously unknown zero-days** in real-world open-source projects.

This blog post provides an in-depth look at our LLM-powered Cyber Reasoning System (CRS) that made this achievement possible. Our complete system is [open source on GitHub](https://github.com/o2lab/afc-crs-all-you-need-is-a-fuzzing-brain).

## The Challenge: Autonomous Vulnerability Discovery

DARPA's AIxCC challenged teams to build systems that could:

1. **Generate Proofs-of-Vulnerability (POVs)**: Create inputs that trigger sanitizer errors in fuzzing harnesses
2. **Produce Patches**: Generate diff files that fix vulnerabilities while preserving functionality  
3. **Operate Autonomously**: Work across three challenge modes (Delta-Scan, Full-Scan, Report-Based)

The competition featured real-world C/C++ and Java projects, with scoring based on accuracy and speed.

## Our Approach: The FuzzingBrain Architecture

### System Overview

FuzzingBrain consists of four core services running in parallel across ~100 VMs:

- **CRS Web Service**: Central coordinator handling task decomposition and fuzzer distribution
- **Static Analysis Service**: Provides function metadata, reachability analysis, and call paths
- **Worker Services**: Execute 23 parallel LLM-based strategies for POV/patch generation  
- **Submission Service**: Manages deduplication, SARIF validation, and bundle creation

### Massive Parallelization

Our key insight was that **parallelization is everything**. We deployed:
- ~100 virtual machines with 32-192 cores each
- 100-10,000 concurrent threads per VM
- 23 distinct LLM-based strategies running simultaneously
- Multiple fuzzing harnesses processed concurrently

This architecture enabled us to discover most vulnerabilities within the **first 30 minutes** of analysis.

## Technical Deep Dive: LLM-Powered Strategies

### POV Generation: 10 Specialized Strategies

Our POV generation employs iterative, dialogue-based interaction with LLMs:

#### Base Strategy (xs0_delta)
```
System Prompt → User Message (diff + harness) → LLM Response → 
Python Execution → Fuzzer Test → Feedback Loop
```

#### Advanced Enhancements

**Multi-Input Generation**: Generate 5 test cases per iteration instead of 1

**Coverage-Guided Feedback**: For failed attempts, we provide:
- Executed functions with ±3 lines of context
- Branch decisions and control flow information  
- LCOV-style reports for C/C++, JaCoCo for Java

**Vulnerability Category Prompting**: Targeted prompts for specific CWE classes:
- C/C++: Buffer overflows, use-after-free, integer overflows (10 categories)
- Java: Deserialization, injection, XXE processing (15 categories)

### Patching: 13 Sophisticated Strategies  

Our patching follows a rigorous 7-step workflow:

1. **Target Function Identification**: LLM-based analysis to find vulnerable functions
2. **Metadata Extraction**: Complete source code and context retrieval
3. **Patch Generation**: LLM produces revised function implementations
4. **Function Rewrite**: Replace original with LLM-generated content
5. **Diff Creation**: Generate standard .diff files
6. **Validation**: Compilation + POV testing + functionality tests
7. **Iterative Refinement**: Structured feedback for failed attempts

#### Novel XPatch Strategy

Our **XPatch** approach generates patches even without POVs:

- **Delta-scan**: Analyze all modified functions from commit diffs
- **Full-scan**: LLM scoring of fuzzer-reachable functions (1-10 scale)
- **Validation**: 60-second LibFuzzer runs to detect new crashes

## Multi-Model Resilience

We implemented a robust fallback mechanism across frontier LLMs:
- **claude-3.7**, **chatgpt-latest**, **claude-opus-4**, **o3**, **gemini-2.5-pro**
- Up to 5 iterations per model before automatic fallback
- Leverages complementary strengths of different models

When one model fails, the system seamlessly transitions to the next, maximizing success rates.

## Static Analysis: Custom Toolchains

### C/C++ Analysis Pipeline
- **LLVM + SVF + Bear**: Generate bitcode → construct call graphs → compute reachability
- **Engineering Challenges**: Missing headers, large bitcode files (>50MB)
- **Solutions**: Parallel analysis, trimming, 10-minute timeouts
- **Performance**: >95% success rate on curl, dropbear, sqlite3

### Java Analysis with CodeQL
- **Custom Queries**: Reachable functions and call path computation
- **Batch Processing**: 1,000 fuzzer-target pairs per batch
- **Isolated Execution**: Cloned databases prevent race conditions
- **Speed**: <5 minutes for Apache Zookeeper, Tika, Commons-Compress

## Competition Results: By the Numbers

### Final Round Performance
- **28 total vulnerabilities discovered**
- **6 zero-day vulnerabilities** (previously unknown)
- **14 successful patches** with functionality preservation
- **4th place** out of 7 finalist teams
- **60 total challenges** in the final round

### Key Performance Insights

**Speed**: Most vulnerabilities found within 30 minutes
**Effectiveness**: LLM strategies discovered nearly all POVs vs. traditional fuzzing
**Scalability**: Successfully handled 50+ fuzzers per project
**Accuracy**: Maintained high precision through rigorous validation

## Lessons Learned & Optimizations

### Resource Management
- **Sanitizer Selection**: Prioritized AddressSanitizer over Memory/UndefinedBehavior
- **Time Budgeting**: 60-minute caps on LLM fuzzing, 45 minutes if POVs exist
- **Patch Submission Limits**: Max 5 POV-based + 3 XPatches per vulnerability

### API Cost Control
We exhausted OpenAI credits in one round due to workers assigned to unreachable code. Our solution:
- Static analysis preprocessing to identify reachable targets
- Early termination for impossible scenarios
- Resource allocation based on reachability analysis

## Open Source Contributions

### FuzzingBrain CRS
Complete system implementation with all 23 strategies:
**[github.com/o2lab/afc-crs-all-you-need-is-a-fuzzing-brain](https://github.com/o2lab/afc-crs-all-you-need-is-a-fuzzing-brain)**

### LLM Vulnerability Detection Leaderboard  
Benchmarking framework for comparing LLMs on security tasks:
**[fuzzingbrain.github.io/FuzzingBrain-Leaderboard](https://fuzzingbrain.github.io/FuzzingBrain-Leaderboard)**

## Research Team

Our interdisciplinary team spanned three institutions:

**Texas A&M University**: Jeff Huang (PI), Ze Sheng, Qingxiao Xu, Jianwei Huang, Matthew Woodcock, Guofei Gu

**City University of Hong Kong**: Heqing Huang  

**Imperial College London**: Alastair F. Donaldson

## Looking Forward

The success of FuzzingBrain demonstrates the immense potential of LLM-powered security analysis. Key areas for future research:

- **Model Specialization**: Training domain-specific models for vulnerability detection
- **Hybrid Approaches**: Better integration of symbolic execution and dynamic analysis
- **Scalability**: Extending to larger codebases and more programming languages
- **Real-time Defense**: Applying techniques to production security monitoring

## Conclusion

Our 4th place finish in DARPA's AIxCC represents a significant milestone in autonomous vulnerability discovery. By combining massive parallelization, sophisticated LLM strategies, and robust engineering, we created a system capable of finding critical security flaws at unprecedented scale and speed.

The cybersecurity landscape is evolving rapidly, and we believe LLM-powered analysis will play an increasingly crucial role in defending against emerging threats. We're excited to continue pushing the boundaries of what's possible in automated security research.

---

*Want to learn more? Check out our [complete technical paper](link-to-paper) and explore our [open source implementation](https://github.com/o2lab/afc-crs-all-you-need-is-a-fuzzing-brain).*

*Questions or collaboration opportunities? Reach out to our team at [contact information].*