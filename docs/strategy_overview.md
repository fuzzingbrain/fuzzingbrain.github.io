---
layout: docs
title: Strategy Overview
---

# CRS Strategy Overview: Framework and Models

💡This document describes the common framework, constants, and model configurations shared across all CRS POV generation strategies.


## Strategy Inventory

Here shows all available strategies in our CRS.

| Strategy File | Category | Task Type | Language | Purpose |
|---------------|----------|-----------|----------|---------|
| **POV Generation - Basic Phase (xs)** | | | | |
| xs0_delta.py | Basic POV | Delta | Universal | Core delta vulnerability detection |
| xs0_c_full.py | Basic POV | Full Scan | C/C++ | Basic C/C++ comprehensive scan |
| xs1_c_full.py | Basic POV | Full Scan | C/C++ | Enhanced C/C++ with advanced analysis |
| xs0_java_full.py | Basic POV | Full Scan | Java | Basic Java comprehensive scan |
| xs1_java_full.py | Basic POV | Full Scan | Java | Enhanced Java with JVM optimization |
| xs2_java_full.py | Basic POV | Full Scan | Java | Advanced Java with extended features |
| **POV Generation - Advanced Phase (as)** | | | | |
| as0_delta.py | Advanced POV | Delta | Universal | Multi-context delta analysis |
| as0_full.py | Advanced POV | Full Scan | Universal | Comprehensive advanced scanning |
| **Patch Generation - Basic** | | | | |
| patch0_delta.py | Basic Patch | Delta | Universal | Fundamental delta patching |
| patch0_full.py | Basic Patch | Full Scan | Universal | Fundamental full scan patching |
| **Patch Generation - Enhanced** | | | | |
| patch1_delta.py | Enhanced Patch | Delta | Universal | Improved delta patching |
| patch1_full.py | Enhanced Patch | Full Scan | Universal | Improved full scan patching |
| patch2_delta.py | Enhanced Patch | Delta | Universal | Advanced multi-approach delta patching |
| patch2_full.py | Enhanced Patch | Full Scan | Universal | Advanced multi-approach full patching |
| patch3_delta.py | Enhanced Patch | Delta | Universal | Context-enhanced delta patching |
| patch3_full.py | Enhanced Patch | Full Scan | Universal | Context-enhanced full patching |
| **Patch Generation - Unified** | | | | |
| patch_delta.py | Unified Patch | Delta | Universal | Consolidated delta patching framework |
| patch_full.py | Unified Patch | Full Scan | Universal | Consolidated full scan framework |
| **Emergency Patching (XPatch)** | | | | |
| xpatch_delta.py | Emergency | Delta | Universal | POV-free delta patching |
| xpatch_full.py | Emergency | Full Scan | Universal | POV-free full scan patching |
| xpatch_sarif.py | Emergency | SARIF | Universal | SARIF report-based patching |
| **Specialized Strategies** | | | | |
| sarif_pov0.py | SARIF POV | SARIF | Universal | SARIF-driven vulnerability detection |
| generate_fuzzer.py | Fuzzer Gen | Dynamic | Universal | Automated fuzzer generation |

### Strategy Classification Summary

| Category | Strategy Count | Primary Use Case |
|----------|---------------|------------------|
| **Basic POV (xs*)** | 6 strategies | Rapid initial vulnerability detection |
| **Advanced POV (as*)** | 2 strategies | Deep multi-context analysis |
| **Basic Patching** | 2 strategies | Fundamental vulnerability remediation |
| **Enhanced Patching** | 6 strategies | Sophisticated multi-approach patching |
| **Unified Patching** | 2 strategies | Consolidated patching frameworks |
| **Emergency Patching** | 3 strategies | POV-independent remediation |
| **Specialized Tools** | 2 strategies | Domain-specific functionality |

### Strategy Execution Flow

```
Task Type Detection
       ↓
Basic Phase (xs*), Advanced Phase (as*) ──→ POV Found ──→ Patch Generation
       ↓                                                        ↓
                                                          patch*_[type].py                              
   Still No POV                       
       ↓                              
Emergency XPatch ──→ Direct Patching
```

## Supported LLM Models
| Model | Vendor | Knowledge Cutoff | Model Family |
|-------|--------|------------------|--------------|
| **OpenAI Models** | | | |
| chatgpt-4o-latest | OpenAI | April 2024 | GPT-4o |
| gpt-4o-mini | OpenAI | October 2023 | GPT-4o |
| o1 | OpenAI | October 2023 | o1 |
| o1-pro | OpenAI | October 2023 | o1 |
| o3 | OpenAI | October 2023 | o3 |
| o3-mini | OpenAI | October 2023 | o3 |
| o4-mini | OpenAI | June 2024 | o4 |
| gpt-4.1 | OpenAI | June 2024  | GPT-4 |
| gpt-4.5-preview | OpenAI | June 2024  | GPT-4 |
| **Claude Models** | | | |
| claude-3-7-sonnet-latest | Anthropic | April 2024 | Claude 3.5 |
| claude-3-5-sonnet-20241022 | Anthropic | April 2024 | Claude 3.5 |
| claude-sonnet-4-20250514 | Anthropic | January 2025 | Claude 4 |
| claude-opus-4-20250514 | Anthropic | January 2025 | Claude 4 |
| **Gemini Models** | | | |
| gemini-2.5-pro-preview-03-25 | Google | April 2024 | Gemini 2.5 |
| gemini-2.5-pro-preview-05-06 | Google | April 2024 | Gemini 2.5 |
| gemini-2.5-pro | Google | April 2024 | Gemini 2.5 |
| gemini-2.5-flash | Google | April 2024 | Gemini 2.5 |
| gemini-2.0-pro-exp-02-05 | Google | April 2024 | Gemini 2.0 |
| gemini-2.0-flash | Google | April 2024 | Gemini 2.0 |
| gemini-2.5-flash-lite-preview-06-17 | Google | April 2024 | Gemini 2.5 |
| **Grok Models** | | | |
| xai/grok-3-beta | xAI | November 2024 | Grok 3 |

## Default Model Configuration

The default model selection prioritizes Anthropic's Claude models:

```python
MODELS = [
    CLAUDE_MODEL,           # claude-3-7-sonnet-latest
    CLAUDE_MODEL_OPUS_4,    # claude-opus-4-20250514  
    CLAUDE_MODEL_35         # claude-3-5-sonnet-20241022
]
```

**Selection Rationale:**
- **Primary**: Claude 3.5 Sonnet Latest - Balanced performance and reasoning
- **Secondary**: Claude Opus 4 - Maximum capability for complex analysis
- **Tertiary**: Claude 3.5 Sonnet Specific - Stable fallback version

## Common Framework Components

### 1. Execution Control
- **MAX_ITERATIONS**: Maximum number of POV generation attempts per strategy
- **FUZZING_TIMEOUT_MINUTES**: Time limit for individual fuzzing operations
- **PATCHING_TIMEOUT_MINUTES**: Time limit for patch generation operations

### 2. Model Management
- **Multi-vendor Support**: OpenAI, Anthropic, Google, and xAI models
- **Graceful Fallback**: Sequential model attempts upon failure
- **Version Control**: Specific model versions for reproducibility

### 3. Strategy Types
- **Delta Strategies**: Focus on commit-specific vulnerability detection
- **Full Scan Strategies**: Comprehensive codebase analysis
- **Language-Specific**: Tailored approaches for C/C++ and Java

### 4. Phase Differentiation
- **Basic Phase (xs*)**: Rapid initial POV generation attempts
- **Advanced Phase (as*)**: Sophisticated multi-context analysis


# Strategy Execution Parameters

All CRS strategies accept a standardized set of command-line parameters for configuration and execution control:

## Parameter Reference

| Parameter | Type | Required | Description | Example Value |
|-----------|------|----------|-------------|---------------|
| **Basic Parameters** | | | | |
| `fuzzer_path` | Positional | Yes | Path to the target fuzzer executable | `/out/libpng_read_fuzzer` |
| `project_name` | Positional | Yes | Name of the target project | `libpng` |
| `focus` | Positional | Yes | Focus area or component | `example-libpng` |
| `language` | Positional | Yes | Programming language of target | `c`, `java`, `cpp` |
| **POV Generation Control** | | | | |
| `--pov-metadata-dir` | String | Yes | Directory for POV metadata storage | `successful_povs_0` |
| `--max-iterations` | Integer | No | Maximum POV generation attempts | `3`, `4`, `5` |
| `--fuzzing-timeout` | Integer | No | Timeout for individual fuzzing operations (minutes) | `45`, `30`, `60` |
| `--pov-phase` | Integer | No | Current phase number (Advanced strategies only) | `0`, `1`, `2`, `3` |
| **Task Configuration** | | | | |
| `--full-scan` (deprecated) | Boolean | No | Enable full scan mode | `true`, `false` |
| `--do-patch` (deprecated) | Boolean | No | Enable patching after POV discovery | `true`, `false` |
| `--check-patch-success` | Flag | No | Verify patch effectiveness | N/A |
| **Strategy Behavior** | | | | |
| `--use-coverage` | Boolean | No | Enable coverage-guided generation | `true`, `false` |
| `--enable-static-analysis` | Boolean | No | Use static analysis for context | `true`, `false` |
| `--multi-model` | Boolean | No | Use multiple LLM models | `true`, `false` |

## Parameter Usage by Strategy Type

| Strategy Type | Core Parameters | Advanced Parameters | Specialized Parameters |
|---------------|----------------|-------------------|----------------------|
| **Basic POV (xs*)** | All basic parameters | `--max-iterations` | `--use-coverage` |
| **Advanced POV (as*)** | All basic parameters | All advanced parameters | All specialized parameters |
| **Patch Strategies** | Basic + `--do-patch=true` | `--fuzzing-timeout` | `--check-patch-success` |
| **Emergency (XPatch)** | Basic parameters only | N/A | Custom XPatch flags |

## Dynamic Parameter Assignment

Parameters are dynamically assigned based on execution context:

### Basic Phase Assignment
```bash
python3 xs0_delta.py \
   /out/libpng_read_fuzzer \
   libpng \
   example-libpng \
   c \
   --pov-metadata-dir successful_povs_0 \
   --check-patch-success
···
