---
layout: docs
title: Task Processing
permalink: /docs/task_processing.html
---

# Task Processing

![Task Distribution](images/task_distribution.png)

*This diagram illustrates our task distribution strategy.*

💡This document describes how CRS parses, processes, and distributes tasks, as well as how it allocates time and resources for optimal vulnerability detection and remediation.

## Overview

The Cyber Reasoning System (CRS) implements a multi-phase execution framework that orchestrates vulnerability detection and remediation through three distinct phases, each serving specific purposes in the vulnerability detection pipeline.

### Phase Architecture Summary

CRS organizes its execution into three primary phases that run concurrently:

1. **Basic Phase**: Initial rapid vulnerability detection using parallel LLM-based strategies
2. **Advanced Phases**: Multi-round sophisticated vulnerability exploration with enhanced context
3. **LibFuzzer Integration**: Continuous traditional fuzzing running in parallel as a baseline

### Execution Model

```go
// Three main phases run concurrently
go func() {
    // Basic Phase: Initial LLM strategies
    pov_success = s.runStrategies(myFuzzer, taskDir, projectDir, fuzzDir, cfg.Language, taskDetail, fullTask)
    if pov_success {
        povFound.Do(func() { close(povChan) })
    }
}()

go func() {
    // Advanced Phases: Multi-round execution
    for roundNum := 1; ; roundNum++ {
        // Execute 4 phases per round (sequential or parallel)
        s.runAdvancedPOVStrategiesWithTimeout(...)
    }
}()

// LibFuzzer: Continuous background fuzzing
if lang == "c" || lang == "c++" {
    go func() {
        s.runLibFuzzer(myFuzzer, taskDir, projectDir, cfg.Language, taskDetail, fullTask)
    }()
}
```

### Time Allocation Strategy

- **POV Detection**: 80% of total working time budget
- **LibFuzzer**: 50% of remaining time (parallel execution)
- **Safety Buffer**: Reserved time for submission and cleanup
- **Mid-point XPatch**: Emergency patching strategy at 50% time mark

## Phase 1: Basic Phase

The Basic Phase represents the first line of attack, executing multiple LLM-based strategies in parallel to achieve rapid vulnerability reproduction.

### Purpose and Goals

- **Rapid POV generation**: Quick vulnerability reproduction using direct LLM approaches
- **Multi-strategy parallel execution**: Maximize success probability through diversity
- **Early termination**: Stop all other work immediately upon first success

### Strategy Discovery and Selection

```go
func (s *defaultCRSService) runStrategies(...) bool {
    strategyDir := "/app/strategy"
    
    // Strategy selection based on task type
    strategyFilePattern := "xs*_delta.py"
    if taskDetail.Type == "full" {
        switch strings.ToLower(language) {
        case "c", "cpp", "c++":
            strategyFilePattern = "xs*_c_full.py"
        case "java", "jvm":
            strategyFilePattern = "xs*_java_full.py"
        default:
            strategyFilePattern = "xs*_full.py"
        }
    }
    
    strategyFiles, err := filepath.Glob(filepath.Join(strategyDir, "**", strategyFilePattern))
    log.Printf("Found %d strategy files: %v", len(strategyFiles), strategyFiles)
```

**Strategy Types**:
- **Delta Tasks**: `xs*_delta.py` - Focus on commit-specific vulnerabilities
- **Full Scan Tasks**: Language-specific patterns with fallback options
- **Dynamic Discovery**: Filesystem-based strategy loading allows easy extension

### Parallel Strategy Execution

**Individual Strategy Timeout**: Each strategy runs for maximum **45 minutes**

```go
const strategyTimeout = 45 * time.Minute
strategyCtx, strategyCancel := context.WithTimeout(ctx, strategyTimeout)

// Run each strategy in parallel
for _, strategyFile := range strategyFiles {
    wg.Add(1)
    go func(strategyPath string) {
        defer wg.Done()
        // Execute individual strategy with 45-minute timeout
    }(strategyFile)
}
```

**Execution Characteristics**:
- **Parallel execution**: All discovered strategies run simultaneously
- **Individual timeouts**: Each strategy has independent 45-minute limit
- **First success wins**: Any strategy finding POV terminates all others
- **Resource isolation**: Each strategy runs in separate process group

### POV Detection and Coordination

```go
// Real-time POV monitoring every 5 seconds
ticker := time.NewTicker(5 * time.Second)

for {
    select {
    case <-ticker.C:
        povDir := filepath.Join(fuzzDir, s.povMetadataDir)
        if _, err := os.Stat(povDir); err == nil {
            files, err := os.ReadDir(povDir)
            if err == nil && len(files) > 0 {
                // POV found - signal but continue for more POVs
                select {
                case povFoundChan <- true:
                    log.Printf("Strategy %s: Signaled POV found", strategyName)
                    povFound = true
                default:
                    povFound = true
                }
            }
        }
    }
}
```

**Detection Mechanisms**:
- **Filesystem monitoring**: Checks POV metadata directory every 5 seconds
- **Output parsing**: Backup detection via "POV SUCCESS!" string matching
- **Non-blocking signals**: Prevents deadlock with multiple simultaneous discoveries
- **Continued execution**: Strategies keep running after first POV to generate more exploits

### Phase Termination

The Basic Phase terminates when:
1. **Any strategy finds POV** → Immediate success, cancel all other strategies
2. **All strategies complete without POV** → Proceed to Advanced Phases
3. **Individual strategy timeout (45 min)** → Kill that strategy, others continue

## Phase 2: Advanced Phases

Advanced Phases activate when Basic Phase fails, implementing multi-round execution with increasing sophistication and enhanced context provision. **Crucially, Advanced Phases use completely different strategy files (`as*` patterns) than Basic Phase (`xs*` patterns), enabling more sophisticated vulnerability analysis techniques.**

### Strategy Discovery and Advanced Features

```go
func (s *defaultCRSService) runAdvancedPOVStrategiesWithTimeout(...) bool {
    strategyDir := "/app/strategy"
    
    // Advanced strategies use 'as*' pattern instead of 'xs*'
    strategyFilePattern := "as*_delta.py"
    if taskDetail.Type == "full" {
        strategyFilePattern = "as*_full.py"
    }
    
    strategyFiles, err := filepath.Glob(filepath.Join(strategyDir, "**", strategyFilePattern))
    log.Printf("Found %d strategy files: %v", len(strategyFiles), strategyFiles)
```

**Key Differences from Basic Phase:**
- **Different Strategy Files**: Uses `as*` pattern instead of `xs*`, implementing more sophisticated algorithms
- **Enhanced Parameters**: Advanced strategies receive additional context and configuration
- **Dynamic Timeout Management**: Timeout based on remaining budget rather than fixed duration

### Advanced Strategy Parameters

```go
// Dynamic iteration control based on available time
maxIterations := 3
if timeoutMinutes <= 30 {
    maxIterations = 3
} else if timeoutMinutes <= 60 {
    maxIterations = 4
} else {
    maxIterations = 5
}

args := []string{
    strategyPath,
    myFuzzer,
    taskDetail.ProjectName,
    taskDetail.Focus,
    language,
    "--do-patch=false",
    "--pov-metadata-dir", s.povAdvcancedMetadataDir,  // Different metadata directory
    "--check-patch-success",
    fmt.Sprintf("--fuzzing-timeout=%d", timeoutMinutes),  // Dynamic timeout
    fmt.Sprintf("--pov-phase=%d", phase),                 // Phase context (0-3)
    fmt.Sprintf("--max-iterations=%d", maxIterations),    // Adaptive iteration count
}
```

**Advanced Strategy Features:**
- **Phase-Aware Execution**: `--pov-phase` parameter enables different analysis levels per phase
- **Adaptive Iteration Count**: More time budget allows deeper analysis iterations
- **Dynamic Timeout**: Strategies receive precise time remaining information
- **Enhanced Metadata**: Uses separate advanced metadata directory for richer context

```go
// 80% of working time allocated to POV generation
initialPovBudgetMinutes := int(float64(workingBudgetMinutes) * 0.8)
initialPovBudgetDuration := time.Duration(initialPovBudgetMinutes) * time.Minute

var totalPovTimeSpent time.Duration

// Each round calculates remaining budget
remainingPovBudgetDuration := initialPovBudgetDuration - totalPovTimeSpent
```

**Budget Allocation**:
- **Total POV Budget**: 80% of working time
- **Cumulative tracking**: Time spent across all rounds is tracked
- **Dynamic allocation**: Each round gets remaining budget
- **Minimum/Maximum limits**: 1-60 minutes per round

### Multi-Round Execution Structure

```go
for {
    roundNum++
    
    // Triple exit condition check
    select {
    case <-povChan:
        return // POV found
    default:
    }
    
    if currentTime.After(deadlineTime.Add(-safetyBufferMinutes)) {
        return // Deadline approaching
    }
    
    if remainingPovBudgetDuration <= 0 {
        return // Budget exhausted
    }
    
    // Execute round strategies
    if sequentialTestRun {
        executeSequentialPhases(roundNum, roundTimeoutMinutes)
    } else {
        executeParallelPhases(roundNum, roundTimeoutMinutes)
    }
}
```

**Round Termination Conditions**:
1. **POV Discovery**: Immediate termination across all rounds
2. **Deadline Proximity**: Safety buffer enforcement
3. **Budget Exhaustion**: No remaining POV time allocation

### Sequential vs Parallel Execution Modes

#### Sequential Mode
```go
// 4 phases with graduated time allocation
phaseRatios := []float64{0.1, 0.2, 0.2, 0.5}

for phase, timeout := range phaseTimeouts {
    pov_success = s.runAdvancedPOVStrategiesWithTimeout(..., timeout, phase, roundNum)
    if pov_success {
        povFound.Do(func() { close(povChan) })
        break // Exit phase loop immediately
    }
}
```

**Phase Progression**:
- **Phase 1 (10% of round budget)**: Enhanced context provision
- **Phase 2 (20% of round budget)**: Category-specific vulnerability targeting  
- **Phase 3 (20% of round budget)**: Full source code analysis integration
- **Phase 4 (50% of round budget)**: Runtime trace incorporation and dynamic analysis

#### Parallel Mode
```go
numPhases := 4
var roundWG sync.WaitGroup

for phase := 0; phase < numPhases; phase++ {
    roundWG.Add(1)
    go func(phase int) {
        defer roundWG.Done()
        pov_success = s.runAdvancedPOVStrategiesWithTimeout(..., roundTimeoutMinutes, phase, roundNum)
        if pov_success {
            povFound.Do(func() { close(povChan) })
        }
    }(phase)
}
roundWG.Wait()
```

**Parallel Characteristics**:
- **All phases run simultaneously**: Maximum exploration coverage
- **Full round timeout per phase**: Each phase gets complete round budget
- **First success terminates**: Any phase success triggers global termination

### Cross-Fuzzer Resource Optimization

```go
llmFuzzingDuration := time.Since(llmFuzzingStartTime)
pov_count, patch_count, err := s.getPOVStatsFromSubmissionService(taskDetail.TaskID.String())

if pov_count > 0 && llmFuzzingDuration > 45 * time.Minute {
    log.Printf("POV already found in other fuzzers. Stop LLM Fuzzer %s", myFuzzer)
    break
} else if llmFuzzingDuration > totalLibfuzzingTime || llmFuzzingDuration > 60 * time.Minute {
    log.Printf("Halftime or 1h passed. Stop LLM Fuzzer %s", myFuzzer)
    break
}
```

**Optimization Rules**:
- **45-minute rule**: Stop if other fuzzers found POVs and current runtime > 45 minutes
- **Half-time rule**: Stop at 50% of total time allocation
- **1-hour maximum**: Hard limit on Advanced Phase execution per fuzzer

## Phase 3: LibFuzzer Integration

LibFuzzer provides continuous baseline fuzzing capability, running in parallel with LLM-based strategies throughout the entire task duration.

### Activation Strategy

```go
// Immediate start for C/C++ projects
if lang == "c" || lang == "c++" {
    libFuzzerStarted = true
    go func() {
        s.runLibFuzzer(myFuzzer, taskDir, projectDir, cfg.Language, taskDetail, fullTask)
    }()
}

// Delayed start for other languages after Basic Phase failure
if !pov_success && !libFuzzerStarted {
    go func() {
        s.runLibFuzzer(myFuzzer, taskDir, projectDir, cfg.Language, taskDetail, fullTask)
    }()
}
```

**Activation Logic**:
- **C/C++ Projects**: Immediate activation alongside Basic Phase
- **Other Languages**: Delayed activation after Basic Phase failure
- **Continuous Operation**: Runs for entire task duration
- **Independent Timeline**: 50% of total time allocation

### Functional Roles

1. **Seed Corpus Generation**: Creates diverse input samples for LLM strategy enhancement
2. **Coverage Baseline**: Establishes reachability metrics for targeted optimization
3. **Fallback Mechanism**: Ensures baseline vulnerability detection capability
4. **Long-term Exploration**: Maintains systematic exploration while LLM strategies focus on specific targets

## Mid-Point Emergency Strategy: XPatch

At the temporal midpoint (50% of total time), CRS activates emergency patching strategies if no POVs or patches have been discovered.

### Activation Conditions

```go
case <- time.After(time.Until(halfTimeToDeadline)):
    if myFuzzer != UNHARNESSED {
        pov_count, patch_count, err := s.getPOVStatsFromSubmissionService(taskDetail.TaskID.String())
        if pov_count == 0 || patch_count == 0 {
            log.Printf("Halftime has passed but NO PATCH found, let's try xpatch...")
            patch_success = s.runXPatchingStrategiesWithoutPOV(...)
        }
    }
```

### XPatch Strategy Hierarchy

1. **Primary XPatch**: Static analysis-based patching without POV requirement
2. **SARIF Integration**: Leverage available SARIF reports for vulnerability localization
3. **Sentinel File Management**: Cross-instance coordination through filesystem signaling

## Task Completion and Result Coordination

### Success Path: POV-Based Patching

```go
select {
case <-povChan:
    log.Println("POV found, proceeding to patching.")
    
    // Use advanced metadata if available, fallback to basic
    advancedMetadataPath := filepath.Join(fuzzDir, s.povAdvancedMetadataDir)
    if _, err := os.Stat(advancedMetadataPath); err == nil {
        patch_success = s.runPatchingStrategies(..., s.povAdvancedMetadataDir, ...)
    } else {
        patch_success = s.runPatchingStrategies(..., s.povMetadataDir0, ...)
    }
}
```

### Failure Paths

- **Half-time without POV/Patch**: Trigger XPatch emergency strategies
- **Deadline reached**: Return failure with comprehensive logging
- **Resource exhaustion**: Graceful degradation with partial results
