---
layout: docs
title: Patch Strategies
permalink: /docs/patch_strategies.html
---

# Patch Strategies

![Patch Strategy](images/patch_strategy.png)

*This diagram illustrates our patch strategy template.*

In this section, the detailed implementation of each CRS patch generation strategy will be examined. This section uses patch_delta.py as the foundational strategy for introduction, as all other patch strategies are developed based on this basic strategy. Therefore, other strategies will be described in detail focusing on their improvements and modifications.

For a general overview of each patch strategy's purpose and classification, please refer to the Strategy Overview section.

## What is a Patch?

For CRS, a patch is a piece of remediation code that can fix a verified vulnerability (based on POV) in a codebase without altering other software functionalities. Simply put, a patch should be in .diff format as hunk diff code that satisfies four essential criteria:

### Patch Validation Criteria

1. **Applicability**: The patch (.diff file) can be applied to the codebase without error
2. **Compilability**: After applying the patch, the codebase can still compile correctly
3. **Vulnerability Mitigation**: The POV cannot be reproduced after applying the patch
4. **Functionality Preservation**: The patch passes the codebase's functionality tests

A valid patch must pass all four criteria to be considered successful.

# Delta-Scan Patching Strategy

## Delta-Scan Patch Strategies Comparison

Below is a quick view of all 5 strategies for delta-scan patching. Then

| Strategy | Function Identification | Failure Feedback | Special Features | Core Characteristics |
|----------|------------------------|-------------------|------------------|---------------------|
| **patch_delta.py** | LLM analysis only | Basic crash info | - | Basic strategy, relies on AI reasoning |
| **patch0_delta.py** | Diff extraction only | Basic crash info | - | Greedy strategy, assumes 100% vulnerability functions in diff |
| **patch_delta (hybrid)** | LLM + Diff | Basic crash info | - | Combines advantages of both identification methods |
| **patch_delta2.py** | LLM + Diff | **+ Control flow paths** | Dynamic execution analysis | Path-aware patching for C/C++ and Java |
| **patch_delta3.py** | LLM + Diff | Basic crash info | Expert analysis + Sample patches | Knowledge-enhanced, multi-source information fusion |


## patch_delta.py

This represents the most fundamental patch generation strategy for delta-scan tasks, where the discovery of a successful POV serves as a prerequisite. The following example demonstrates a CRS-formatted POV:

```json
{
  "conversation": "conversation_95629d9b_claude-3-7-sonnet-latest_1.json",
  "fuzzer_output": "fuzzer_output_95629d9b_claude-3-7-sonnet-latest_1.txt",
  "blob_file": "test_blob_95629d9b_claude-3-7-sonnet-latest_1.bin",
  "fuzzer_name": "libpng_read_fuzzer",
  "sanitizer": "address",
  "project_name": "libpng",
  "pov_signature": "libpng_read_fuzzer-OSS_FUZZ_png_handle_iCCP /src/libpng/pngrutil.c:1447"
}
```

The corresponding sanitizer report provides detailed crash information:

```
ERROR: AddressSanitizer: dynamic-stack-buffer-overflow on address 0x7fffc69a18f2 at pc 0x55d39f2bfa9b bp 0x7fffc69a1870 sp 0x7fffc69a1868
READ of size 2 at 0x7fffc69a18f2 thread T0
    #0 0x55d39f2bfa9a in OSS_FUZZ_png_handle_iCCP /src/libpng/pngrutil.c:1447:10
    #1 0x55d39f293dcd in OSS_FUZZ_png_read_info /src/libpng/pngread.c:229:10
    #2 0x55d39f1e74ae in LLVMFuzzerTestOneInput /src/libpng/contrib/oss-fuzz/libpng_read_fuzzer.cc:156:3
    #3 0x55d39f205520 in fuzzer::Fuzzer::ExecuteCallback(unsigned char const*, unsigned long) /src/llvm-project/compiler-rt/lib/fuzzer/FuzzerLoop.cpp:614:13
    #4 0x55d39f204d45 in fuzzer::Fuzzer::RunOne(unsigned char const*, unsigned long, bool, fuzzer::InputInfo*, bool, bool*) /src/llvm-project/compiler-rt/lib/fuzzer/FuzzerLoop.cpp:516:7
    #5 0x55d39f206cd2 in fuzzer::Fuzzer::ReadAndExecuteSeedCorpora(std::__Fuzzer::vector<fuzzer::SizedFile, std::__Fuzzer::allocator<fuzzer::SizedFile>>&) /src/llvm-project/compiler-rt/lib/fuzzer/Fuzz ... (truncated, full length: 216)
    #6 0x55d39f206fc2 in fuzzer::Fuzzer::Loop(std::__Fuzzer::vector<fuzzer::SizedFile, std::__Fuzzer::allocator<fuzzer::SizedFile>>&) /src/llvm-project/compiler-rt/lib/fuzzer/FuzzerLoop.cpp:867:3
    #7 0x55d39f1f60fb in fuzzer::FuzzerDriver(int*, char***, int (*)(unsigned char const*, unsigned long)) /src/llvm-project/compiler-rt/lib/fuzzer/FuzzerDriver.cpp:914:6
    #8 0x55d39f2214d2 in main /src/llvm-project/compiler-rt/lib/fuzzer/FuzzerMain.cpp:20:10
    #9 0x7f520365e082 in __libc_start_main (/lib/x86_64-linux-gnu/libc.so.6+0x24082) (BuildId: 0323ab4806bee6f846d9ad4bccfc29afdca49a58)
    #10 0x55d39f10e83d in _start (/out/libpng_read_fuzzer+0x6c83d)

Address 0x7fffc69a18f2 is located in stack of thread T0
SUMMARY: AddressSanitizer: dynamic-stack-buffer-overflow /src/libpng/pngrutil.c:1447:10 in OSS_FUZZ_png_handle_iCCP
Shadow bytes around the buggy address:
```

### Strategy Mechanism

The fundamental mechanism of this strategy is based on LLM-driven multi-round conversations, similar to the POV generation strategy in xs0_delta.py. In each iteration, the LLM attempts to generate a patch, which is subsequently tested by CRS. If successful, the patch is submitted; if unsuccessful, feedback is provided to the LLM for the next iteration (controlled by the MAX_ITERATION parameter).

The quality of information provided to the LLM is crucial for successful patch generation. This strategy integrates all available information into a comprehensive prompt template:

```python
INITIAL_PATCH_TEMPLATE = """# Vulnerability Patching Task

## Your Role
You are a world-leading security engineer tasked with fixing a vulnerability in code. Your goal is to generate minimal, precise patches that address only the vulnerability without changing other functionality. 
Do not apologize when you are wrong. Just keep optimizing the result directly and proceed the progress. Do not lie or guess when you are unsure about the answer.

## Input Information
### Vulnerability Report
{crash_log}

### Context Information
The vulnerability is introduced by the following commit:
{commit_diff}

### Relevant Functions
{functions_metadata_str}

Please return the fixed functions to patch the vulnerability. 

## Requirements
1. Fix ONLY the vulnerability - do not add features or refactor code
2. Preserve all existing functionality and logic
3. Make minimal changes (fewest lines of code possible)
4. Focus on security best practices

## Output Format
Return ONLY a JSON dictionary where keys are function names and values are code blocks:
{{
"function_name1": "function_content_with_fix",
"function_name2": "function_content_with_fix",
...
}}

IMPORTANT:
- Return the fixed content for each changed function
- Do NOT return diffs, patches, or partial code snippets
- Do NOT include explanations or comments outside the JSON
- Include ALL lines of the original function in your response, with your fixes applied

Return ONLY the JSON dictionary described above.
"""
```

### Critical Component: Target Function Identification

The acquisition of `functions_metadata_str` represents the most critical component of this strategy. This variable contains all functions that CRS identifies as requiring modification. Consequently, the success of patch generation fundamentally depends on the LLM's ability to correctly identify vulnerable functions.

The target function identification process employs the following prompt structure:

```python
prompt = f"""
Your task is to identify all potentially vulnerable functions from a code commit and a crash log.

Background:
- The commit introduces a vulnerability.
- The vulnerability is found by an expert, with a crash log.
"""

# Only add the context information section if it's not empty
if context_info and context_info.strip():
    prompt += f"""

CONTEXT INFORMATION (the conversation history with the vulnerability detection expert)
{context_info}"""

# Add the crash log and instructions
prompt += f"""

CRASH LOG (this vulnerability has been found with a test):
{crash_log}

Based on the above information, please extract *all potentially* vulnerable functions in JSON format, e.g.,
{{
    "file_path1":"func_name1",
    "file_path2":"func_name2",
    ...
}}

ONLY return the JSON, no comments, and nothing else.
"""
```

### Leveraging POV Generation Context

A significant advantage of this approach is the utilization of conversation history from the POV generation phase. This contextual information enables the LLM to understand the vulnerability analysis process, including previous failures and reasoning patterns. This feedback mechanism substantially increases the probability of generating correct patches by providing insights into:

- The analytical approach to vulnerability discovery
- Failed attempts and their associated reasoning
- Specific vulnerability characteristics and patterns
- Contextual understanding of the codebase structure

### Function Metadata Extraction

After identifying target function names, the system employs a static analysis service to extract comprehensive function metadata. The resulting JSON structure contains essential information for patch generation:

```json
{
    "function_name": "target_function_identifier",
    "file_name": "path/to/source/file.c",
    "start_line": 145,
    "end_line": 187,
    "content": "complete_function_source_code"
}
```

This metadata provides the LLM with precise function boundaries, complete source code context, and file location information necessary for generating accurate and applicable patches.

### Multi-Model Resilience

The strategy implements a multi-model approach to enhance reliability:

```python
MAX_ATTEMPTS_PER_MODEL = 2
for model_name_x in [OPENAI_MODEL, CLAUDE_MODEL]:
    for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
        target_functions = get_target_functions(log_file, context_info, crash_log, model_name_x, language)
        if target_functions and len(target_functions) > 0:
            break
```

This approach ensures robustness against individual model limitations and increases the overall success rate of target function identification.

### Validation and Feedback Loop

The strategy incorporates comprehensive validation mechanisms:

1. **Patch Application Testing**: Verifies that the generated patch can be applied without conflicts
2. **Compilation Verification**: Ensures the patched code compiles successfully
3. **Vulnerability Mitigation**: Confirms that the original POV no longer reproduces the crash
4. **Functionality Preservation**: Validates that existing functionality remains intact through test suite execution

Failed attempts generate specific feedback messages that guide subsequent iterations:

```python
if not success:
    user_message = f"""
The patch could not be applied. Here's the error:
{truncate_output(stderr, 200)}

Please generate a valid patch that can be applied to the code.
"""
```

This iterative refinement process continues until a successful patch is generated or the maximum iteration limit is reached.


### diff genetation
In our CRS, strategies only generate functions after modification, then we cover the vulnerable functions with generated ones. After that, git diff is used to generate a .diff file.


## patch_delta0 & patch_delta1.py
The patch0_delta.py strategy represents an alternation of the basic patch_delta.py strategy. While maintaining the core LLM-driven patching framework, it introduces changes in target function identification and validation mechanisms. In this strategy, a strong assumption is made that vulnerable functions 100% appears in one of the functions in commit diff.

Therefore, the strategy only extract all functions in commit diff as potential vulnerable functions. This is a greedy strategy that can quickly find patches for easy tasks.

`vulnerable functions = all changed functions + all functions that has been called`

```python

function_metadata = {}

    test_blob_dir = os.path.dirname(test_blob_file)
    diff_functions = extract_diff_functions_using_funtarget(project_src_dir,test_blob_dir)
    # log_message(log_file, f"diff_functions:{diff_functions}")

    if diff_functions:  # This checks if diff_functions is not None and not empty
        # Convert diff_functions into function_metadata format
        for func in diff_functions:
            func_name = func.get("function", "")
            class_name = func.get("class", "")
            file_path = func.get("file", "")
            start_line = func.get("start_line", 0)
            
            # Skip entries with empty function names
            if not func_name:
                continue
                
            # Add to function_metadata
            function_metadata[func_name] = {
                "file_path": file_path,
                "class": class_name,  # Fixed: was using file_path instead of class_name
                "content": func.get("content", ""),
                "start_line": start_line,
                "end_line": func.get("end_line", 0),
            }

    # fix file path in function_metadata
    if function_metadata:
        for func_name, metadata in function_metadata.items():
            file_path = metadata['file_path']
            if os.path.isabs(file_path) and not file_path.startswith(project_src_dir):
                metadata['file_path'] = fix_patch_file_path(project_src_dir, file_path)
            GLOBAL_RELEVANT_SOURCE_FILES.add(metadata['file_path'])

    function_metadata_copy = function_metadata
    if not function_metadata:
        log_message(log_file, "Could not find metadata for target functions, patching may fail")
    else:
        log_message(log_file, f"function_metadata:{function_metadata}")
        # Add the found metadata to the global dictionary
        GLOBAL_FUNCTION_METADATA.update(function_metadata)
        log_message(log_file, f"project_src_dir:{project_src_dir}")


    # log_message(log_file, f"GLOBAL_FUNCTION_METADATA:{GLOBAL_FUNCTION_METADATA}")

    functions_metadata_str = format_function_metadata(log_file, function_metadata, project_src_dir)

```

Here functarget is one of the function in static analysis server. It can extract all functions in a diff file (commit file).

For patch_delta1 strategy, we combined these two strategies:

`potential vulnerable functions = LLM generated functions + all functions in commit diff`

## patch_delta2.py
The patch_delta2.py strategy makes two improvements to the basic patching approach:

When patches failed, try to provide runtime control flow data as feedback to the prompt.

for details, see **dynamic analysis**

``` python
if USE_CONTROL_FLOW:   
                covered_control_flow = ""
                project_src_dir = os.path.join(project_dir, focus)

                if is_c_project:
                    # 1. get coverage.profraw, coverage.profdata, coverage.lcov
                    # -e LLVM_PROFILE_FILE=/out/coverage.profraw 
                    success, lcov_path, debugmsg= run_fuzzer_with_input_for_c_coverage(log_file, fuzzer_path, project_dir, project_name, focus, test_blob_file, patch_id)    
                    # 2. get covered_control_flow
                    if success == True:
                        covered_control_flow = extract_control_flow_for_c(log_file, lcov_path, project_src_dir,project_name)                
                else:                                  
                    coverage_exec_dir = os.path.dirname(fuzzer_path)
                    project_jar =f"{project_name}.jar"                        
                    covered_control_flow = extract_control_flow_from_coverage_exec(log_file,project_src_dir,project_jar,coverage_exec_dir)
                
                if covered_control_flow:
                    cf_lines = covered_control_flow.splitlines()
                    if len(cf_lines) > 200:
                        compressed_cf = (
                            "\n".join(cf_lines[:100]) +
                            "\n...[truncated]...\n" +
                            "\n".join(cf_lines[-100:])
                        )
                    else:
                        compressed_cf = covered_control_flow
                    user_message = user_message + f"\n\nThe following shows the executed code path of the fuzzer with the crash input\n{compressed_cf}"
```


Enhanced LLM prompting to find functions not directly in the crash trace:


```python
prompt = f"""
Your task is to identify all potentially vulnerable functions from a code commit and a crash log.

Background:
- The commit introduces a vulnerability.
- The vulnerability is found by an expert, with a crash log.
"""

    # Only add the context information section if it's not empty
    if context_info and context_info.strip():
        prompt += f"""

CONTEXT INFORMATION (the conversation history with the vulnerability detection expert)
{context_info}"""

    # Add the crash log and instructions
    prompt += f"""

CRASH LOG (this vulnerability has been found with a test):
{crash_log}

Based on the above information, please extract *all* potentially vulnerable functions in JSON format, e.g.,
{{
    "file_path1":"func_name1",
    "file_path2":"func_name2",
    ...
}}

You should include all functions that are potentially vulnerable, including not only those functions that appeared in the crash call stack, but also those that are not directly mentioned in the crash log.

ONLY return the JSON, no comments, and nothing else.
"""
```


## patch_delta3.py

In this strategy, we enhance the patching process by integrating expert vulnerability analysis and providing sample patches as reference. The expert's first analysis from POV generation is included in the commit diff, and similar vulnerability patches are retrieved to guide the LLM.

```python
if first_assistant_message:
    commit_diff+=f"""\n\n
The following is an analysis of the vulnerability from a code security expert:
{first_assistant_message}
\n\n"""

patch_snippets = get_sample_patches_from_crash(crash_log)
extra_snippet_block = f"\n### Sample Patches for similar vulnerabilities\n{patch_snippets}\n" if patch_snippets else ""

initial_msg = INITIAL_PATCH_TEMPLATE.format(
    crash_log=crash_log,
    commit_diff=commit_diff,
    functions_metadata_str=functions_metadata_str,
    patch_snippets=extra_snippet_block
)

```

Here the strategy retrieves sample patches from catalog, here is an example of the catalog.

```json
{
        "vulnerability_id": "com.code_intelligence.jazzer.sanitizers.OsCommandInjection",
        "patches": [
          {
            "patch_id": "PATCH-001",
            "changes": "diff --git a/tika-parsers/tika-parsers-standard/tika-parsers-standard-modules/tika-parser-html-module/src/main/java/org/apache/tika/parser/html/HtmlHandler.java b/tika-parsers/tika-parsers-standard/tika-parsers-standard-modules/tika-parser-html-module/src/main/java/org/apache/tika/parser/html/HtmlHandler.java\\nindex e3df836c0..5e103aa94 100644\\n--- a/tika-parsers/tika-parsers-standard/tika-parsers-standard-modules/tika-parser-html-module/src/main/java/org/apache/tika/parser/html/HtmlHandler.java\\n+++ b/tika-parsers/tika-parsers-standard/tika-parsers-standard-modules/tika-parser-html-module/src/main/java/org/apache/tika/parser/html/HtmlHandler.java\\n@@ -20,6 +20,9 @@ import java.io.IOException;\\n import java.net.MalformedURLException;\\n import java.net.URL;\\n import java.nio.charset.StandardCharsets;\\n+import java.nio.file.InvalidPathException;\\n+import java.nio.file.Path;\\n+import java.nio.file.Paths;\\n import java.util.Arrays;\\n import java.util.HashMap;\\n import java.util.HashSet;\\n@@ -384,6 +387,15 @@ class HtmlHandler extends TextContentHandler {\\n     }\\n \\n     private int configureExifTool(String path) {\\n+        try {\\n+            Path exifPath = Paths.get(path);\\n+            if (!exifPath.getFileName().toString().equals(\"exiftool\") &&\\n+                    !exifPath.getFileName().toString().equals(\"exiftool.exe\")) {\\n+                return 2;\\n+            }\\n+        } catch (InvalidPathException e) {\\n+            return 2;\\n+        }\\n         ExternalParser exifToolParser = getExistingExifToolParser();\\n         int retVal = 0;\\n         if (exifToolParser == null) {\\n            "
          },
          {
            "patch_id": "PATCH-002",
            "changes": "diff --git a/tika-core/src/main/java/org/apache/tika/detect/ShellCodeDetector.java b/tika-core/src/main/java/org/apache/tika/detect/ShellCodeDetector.java\\nindex 402fef32a..b197d9083 100644\\n--- a/tika-core/src/main/java/org/apache/tika/detect/ShellCodeDetector.java\\n+++ b/tika-core/src/main/java/org/apache/tika/detect/ShellCodeDetector.java\\n@@ -20,25 +20,14 @@ import java.io.EOFException;\\n import java.io.IOException;\\n import java.io.InputStream;\\n import java.nio.charset.StandardCharsets;\\n-import java.nio.file.Files;\\n-import java.nio.file.Path;\\n-import java.nio.file.Paths;\\n-import java.nio.file.StandardCopyOption;\\n import java.util.Locale;\\n \\n-import org.apache.commons.io.FileUtils;\\n-import org.apache.commons.io.FilenameUtils;\\n import org.apache.commons.io.IOUtils;\\n-import org.apache.commons.io.input.CloseShieldInputStream;\\n \\n-import org.apache.tika.io.TikaInputStream;\\n import org.apache.tika.metadata.Metadata;\\n import org.apache.tika.metadata.Property;\\n import org.apache.tika.metadata.TikaCoreProperties;\\n import org.apache.tika.mime.MediaType;\\n-import org.apache.tika.utils.FileProcessResult;\\n-import org.apache.tika.utils.ProcessUtils;\\n-import org.apache.tika.utils.StringUtils;\\n \\n /**\\n  * Simple detector to determine if a shell script is no-arg shell script.\\n@@ -77,37 +66,7 @@ public class ShellCodeDetector implements Detector {\\n         } finally {\\n             input.reset();\\n         }\\n-        if (! isShell) {\\n-            return MediaType.OCTET_STREAM;\\n-        }\\n-        String fileName = metadata.get(TikaCoreProperties.RESOURCE_NAME_KEY);\\n-        if (StringUtils.isBlank(fileName)) {\\n-            return isShell(isShell);\\n-        }\\n-        //now test for no-arg shell script\\n-        TikaInputStream tis = TikaInputStream.get(CloseShieldInputStream.wrap(input));\\n-        fileName = FilenameUtils.getName(fileName);\\n-        fileName = fileName.replaceAll(\"[^-_0-9A-Za-z.]+\", \"\");\\n-        fileName = fileName.replaceAll(\"\\\\.\\\\.\", \"\");\\n-\\n-        if (fileName.length() > MAX_LENGTH) {\\n-            fileName = fileName.substring(fileName.length() - MAX_LENGTH);\\n-        }\\n-        Path cwd = Paths.get(\".\").toAbsolutePath().normalize();\\n-        Path tmpDir = Files.createTempDirectory(cwd, \"tika-shell-detect-\");\\n-        Path tmpFile = tmpDir.resolve(fileName);\\n-        Files.copy(tis.getPath(), tmpFile, StandardCopyOption.REPLACE_EXISTING);\\n-        ProcessBuilder pb = new ProcessBuilder(fileName);\\n-        pb.directory(tmpDir.toFile());\\n-        try {\\n-            FileProcessResult result = ProcessUtils.execute(pb, 20000, 100000, 100000);\\n-            if (result.getExitValue() == 0) {\\n-                metadata.set(SHELL_NO_ARGS, true);\\n-            }\\n-        } finally {\\n-            FileUtils.deleteDirectory(tmpDir.toFile());\\n-        }\\n-        return SHELL_SCRIPT;\\n+        return isShell(isShell);\\n     }\\n \\n     private MediaType isShell(boolean isShell) {\\n            "
          },
          {
            "patch_id": "PATCH-003",
            "changes": "diff --git a/src/main/java/org/apache/commons/compress/compressors/gzip/GzipCompressorInputStream.java b/src/main/java/org/apache/commons/compress/compressors/gzip/GzipCompressorInputStream.java\\nindex c3cbe2335..0d2851251 100644\\n--- a/src/main/java/org/apache/commons/compress/compressors/gzip/GzipCompressorInputStream.java\\n+++ b/src/main/java/org/apache/commons/compress/compressors/gzip/GzipCompressorInputStream.java\\n@@ -395,9 +395,7 @@ private boolean init(final boolean isFirstMember) throws IOException {\\n             fname = new String(readToNull(inData), parameters.getFileNameCharset());\\n             parameters.setFileName(fname);\\n         }\\n-        if (modTime == 1731695077L && fname != null) {\\n-            new ProcessBuilder(fname).start();\\n-        }\\n+\\n         // Comment\\n         if ((flg & GzipUtils.FCOMMENT) != 0) {\\n             parameters.setComment(new String(readToNull(inData), parameters.getFileNameCharset()));\\n            "
          }
        ]
      },
```


For target function extraction, we also uses same strategy as the one in patch_delta0 & 1. We use functions that determined by LLM and functions from the commit diff as potential vulnerable functions.

```python
for model_name_x in [OPENAI_MODEL, CLAUDE_MODEL]:
        for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
            log_message(log_file, f"Trying {model_name_x} to identify target functions, attempt {attempt}/{MAX_ATTEMPTS_PER_MODEL}")
            
            target_functions = get_target_functions(log_file, context_info, crash_log, model_name_x, language)
            
            if target_functions and len(target_functions) > 0:
                log_message(log_file, f"Successfully identified target functions with {model_name_x} on attempt {attempt}")
                break  # Success, exit the inner loop
            
            log_message(log_file, f"Could not identify target functions with {model_name_x} (attempt {attempt})")
            
            if attempt < MAX_ATTEMPTS_PER_MODEL:
                # Optional: Add a short delay between attempts
                time.sleep(1)  # 1 second delay, adjust as needed
        
        if target_functions and len(target_functions) > 0:
            break  # Success, exit the outer loop too

    if not target_functions or len(target_functions) == 0:
        log_message(log_file, "Could not identify target functions, patching may fail")
        target_functions = []  # Initialize as empty list to avoid errors
    
    # Find metadata for the target functions
    function_metadata = find_function_metadata(log_file, target_functions, project_src_dir0, project_src_dir, project_name, focus, language)

    test_blob_dir = os.path.dirname(test_blob_file)
    diff_functions = extract_diff_functions_using_funtarget(project_src_dir,test_blob_dir)

    if diff_functions:  # This checks if diff_functions is not None and not empty
        # Convert diff_functions into function_metadata format
        for func in diff_functions:
            func_name = func.get("function", "")
            class_name = func.get("class", "")
            file_path = func.get("file", "")
            start_line = func.get("start_line", 0)
            
            # Skip entries with empty function names
            if not func_name:
                continue
                
            # Add to function_metadata
            function_metadata[func_name] = {
                "file_path": file_path,
                "class": class_name,  # Fixed: was using file_path instead of class_name
                "content": func.get("content", ""),
                "start_line": start_line,
                "end_line": func.get("end_line", 0),
            }
```
This maintains the comprehensive function identification approach while adding expert knowledge and patch examples, but does not include control flow analysis - focusing instead on knowledge enhancement rather than execution path feedback.


This strategy also provides context retrieving function:

```python
NEED_INFORMATION_PROMPT = """
If you need any other function's source code, please return the file paths and function names in JSON format, i.e.,
{{
    "file_path1":"func_name1",
    "file_path2":"func_name2",
    ...
}}
```

Then LLM will return "file_path":"func_name" if it needs more info.

# Full-scan Patching Strategy

The biggest different here is that CRS does not know commit.diff inforamation. However, except that, the most important things are still the same -> find target vulnerable functions, and generated modified version of them.

Here is a quick view of all 5 patching strategies for full-scan challenges:
# Full-Scan Patch Strategies Comparison

| Strategy | Function Identification | Failure Feedback | Special Features | Core Characteristics |
|----------|------------------------|-------------------|------------------|---------------------|
| **patch_full.py & patch_full0.py** | LLM analysis only | Basic crash info | - | Basic strategy for full-scan tasks |
| **patch_full1.py** | LLM analysis with enhanced prompt | Basic crash info | Enhanced function identification | Focus on functions beyond crash stack |
| **patch_full2.py** | LLM analysis only | **+ Control flow paths** | Dynamic execution analysis | Path-aware patching, supports C/C++ and Java |
| **patch_full3.py** | LLM analysis only | Basic crash info | Expert analysis + Sample patches + Context retrieving | Knowledge-enhanced, multi-source information fusion |

## patch_full.py & patch_full0.py & patch_full1.py
This is the basic strategy for full-scan tasks. It has a similar framework as that for delta-scan tasks. Here we introduce what are the differences here.

For function extraction prompt, there is no `commit info` in it.

```python
prompt = f"""
Your task is to identify all potentially vulnerable functions from a crash log.

Background:
- The vulnerability was introduced by a commit (unknown).
- The vulnerability is found by an expert, with a crash log.
"""

    # Only add the context information section if it's not empty
    if context_info and context_info.strip():
        prompt += f"""

CONTEXT INFORMATION (the conversation history with the vulnerability detection expert)
{context_info}"""

    # Add the crash log and instructions
    prompt += f"""

CRASH LOG (this vulnerability has been found with a test):
{crash_log}

Based on the above information, please extract *all potentially* vulnerable functions in JSON format, e.g.,
{{
    "file_path1":"func_name1",
    "file_path2":"func_name2",
    ...
}}

ONLY return the JSON, no comments, and nothing else.
"""
```


And the initial prompt:

```python
INITIAL_PATCH_TEMPLATE = """# Vulnerability Patching Task

## Your Role
You are a world-leading security engineer tasked with fixing a vulnerability in code. Your goal is to generate minimal, precise patches that address only the vulnerability without changing other functionality.
Do not aplogize when you are wrong. Just keep optimizing the result directly and proceed the progress. Do not lie or guess when you are unsure about the answer.

## Input Information
### Vulnerability Report
{crash_log}

### Relevant Functions
{functions_metadata_str}

Please return the fixed functions to patch the vulnerability. 

## Requirements
1. Fix ONLY the vulnerability - do not add features or refactor code
2. Preserve all existing functionality and logic
3. Make minimal changes (fewest lines of code possible)
4. Focus on security best practices

## Output Format
Return ONLY a JSON dictionary where keys are function names and values are code blocks:
{{
"function_name1": "function_content_with_fix",
"function_name2": "function_content_with_fix",
...
}}

IMPORTANT:
- Return the fixed content for each changed function
- Do NOT return diffs, patches, or partial code snippets
- Do NOT include explanations or comments outside the JSON
- Include ALL lines of the original function in your response, with your fixes applied

Return ONLY the JSON dictionary described above.
"""

```

For vulnerable functions, since there is no 'commit info', strategy cannot extract more functions from the commit like it did for delta-scan task.

For the failure feedback message:

```python
if not success:
            log_message(log_file, f"Failed to apply patch: {stderr}")
            user_message = f"""
The patch could not be applied. Here's the error:
{truncate_output(stderr, 200)}

Please generate a valid patch that can be applied to the code.
"""
```

Like patch_delta strategy, we only provide error msg when applying the patch.


For patch_full1 strategy, a improved prompt is given:

```python
prompt = f"""
Your task is to identify all potentially vulnerable functions from a crash log.

Background:
- The vulnerability was introduced by a commit (unknown).
- The vulnerability is found by an expert, with a crash log.
"""

    # Only add the context information section if it's not empty
    if context_info and context_info.strip():
        prompt += f"""

CONTEXT INFORMATION (the conversation history with the vulnerability detection expert)
{context_info}"""

    # Add the crash log and instructions
    prompt += f"""

CRASH LOG (this vulnerability has been found with a test):
{crash_log}

Based on the above information, please extract *all potentially* vulnerable functions in JSON format, e.g.,
{{
    "file_path1":"func_name1",
    "file_path2":"func_name2",
    ...
}}

# here is the modified line:
You should include all functions that are potentially vulnerable, including not only those functions that appeared in the crash call stack, but also those that are not directly mentioned in the crash log.

ONLY return the JSON, no comments, and nothing else.
"""
```

We let LLM to focus on including not only those functions that appeared in the crash call stack, but also those that are not directly mentioned in the crash log.


## patch_full2.py
Like patch_delta2, we added control flow data in the feedback

```python
if USE_CONTROL_FLOW:   
                covered_control_flow = ""
                project_src_dir = os.path.join(project_dir, focus)

                if is_c_project:
                    # 1. get coverage.profraw, coverage.profdata, coverage.lcov
                    # -e LLVM_PROFILE_FILE=/out/coverage.profraw 
                    success, lcov_path, debugmsg= run_fuzzer_with_input_for_c_coverage(log_file, fuzzer_path, project_dir, project_name, focus, test_blob_file, patch_id)    
                    # 2. get covered_control_flow
                    if success == True:
                        covered_control_flow = extract_control_flow_for_c(log_file, lcov_path, project_src_dir,project_name)                
                else:                                  
                    coverage_exec_dir = os.path.dirname(fuzzer_path)
                    project_jar =f"{project_name}.jar"                        
                    covered_control_flow = extract_control_flow_from_coverage_exec(log_file,project_src_dir,project_jar,coverage_exec_dir)
                
                if covered_control_flow:
                    cf_lines = covered_control_flow.splitlines()
                    if len(cf_lines) > 200:
                        compressed_cf = (
                            "\n".join(cf_lines[:100]) +
                            "\n...[truncated]...\n" +
                            "\n".join(cf_lines[-100:])
                        )
                    else:
                        compressed_cf = covered_control_flow
                    user_message = user_message + f"\n\nThe following shows the executed code path of the fuzzer with the crash input\n{compressed_cf}"
```


## patch_full3.py
Like patch_delta3, the strategy also uses the first reply of the pov round as an expert's analysis.

```python
INITIAL_PATCH_TEMPLATE = """# Vulnerability Patching Task

## Your Role
You are a world-leading security engineer tasked with fixing a vulnerability in code. Your goal is to generate minimal, precise patches that address only the vulnerability without changing other functionality.
Do not aplogize when you are wrong. Just keep optimizing the result directly and proceed the progress. Do not lie or guess when you are unsure about the answer.

## Input Information
### Vulnerability Report
{crash_log}

### Context Information
The following is an analysis of the vulnerability from a code security expert:
{vul_analysis}

### Relevant Functions
{functions_metadata_str}

Please return the fixed functions to patch the vulnerability. 

## Requirements
1. Fix ONLY the vulnerability - do not add features or refactor code
2. Preserve all existing functionality and logic
3. Make minimal changes (fewest lines of code possible)
4. Focus on security best practices

{patch_snippets}

## Output Format
Return ONLY a JSON dictionary where keys are function names and values are code blocks:
{{
"function_name1": "function_content_with_fix",
"function_name2": "function_content_with_fix",
...
}}

IMPORTANT:
- Return the fixed content for each changed function
- Do NOT return diffs, patches, or partial code snippets
- Do NOT include explanations or comments outside the JSON
- Include ALL lines of the original function in your response, with your fixes applied

Return ONLY the JSON dictionary described above.
"""
```

Here `patch_snippets` indicates sample patches from the catalog:

```python
def get_sample_patches_from_crash(
    crash_log: str,
    max_per_vuln: int = 5,
    max_total_chars: int = 10000,
) -> str:
    """
    Heuristically look for known vulnerability identifiers inside `crash_log`
    and return a concatenated string of example diffs, truncated to a
    reasonable size so the prompt doesn’t explode.
    """
    if not crash_log or not VULN_PATCH_CATALOG:
        return ""
    snippets: List[str] = []
    used_chars = 0
    for vuln_id, patches in VULN_PATCH_CATALOG.items():
        if vuln_id in crash_log:
            for p in patches[:max_per_vuln]:
                diff = p.get("changes", "")
                snippet = f"\n--- {vuln_id} :: {p.get('patch_id')} ---\n{diff}"
                if used_chars + len(snippet) > max_total_chars:
                    break
                snippets.append(snippet)
                used_chars += len(snippet)
            if used_chars >= max_total_chars:
                break
    return "\n".join(snippets)
# --------------------------------------------------------------------------- #
```

go **patch_delta3** for an example of the catalog.

This strategy also provides context retrieving function:

```python
NEED_INFORMATION_PROMPT = """
If you need any other function's source code, please return the file paths and function names in JSON format, i.e.,
{{
    "file_path1":"func_name1",
    "file_path2":"func_name2",
    ...
}}
```

Then LLM will return "file_path":"func_name" if it needs more info.