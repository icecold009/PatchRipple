# Graph schema v1

The machine schema is emitted to schema/graph-v1.json by the build. src/model.ts defines types and validates structure plus cross-node invariants.

Nodes use file: followed by a repository-relative POSIX path. Newlines/Unicode are permitted; absolute paths, traversal, backslashes and NUL are not. Edges point from importer to dependency and carry base/head provenance and import kind. Nodes explicitly state which revisions contain them; links must respect that presence. Rename records preserve old/new paths without claiming symbol identity.

PR mode compares merge-base(base tip, head) to head. Direct mode is explicitly selected. Both input SHAs and analysis base are recorded. Changes list remains complete even when the displayed graph is bounded.

Semantic graph JSON has canonical ordering and no timestamp. metadata.json supplies generatedAt, tool version and bounds. Warning.category distinguishes expected external exclusions, unresolved local imports, resource limits and other analysis uncertainty. Expected external exclusions stay in warnings but do not alone make completeness false; unresolved local paths, unsupported configuration, parser uncertainty and any omission do. This is completeness within documented static syntax, never runtime safety or test coverage.

Validation rejects duplicate nodes/edges, dangling endpoints, revision-inconsistent edges, invalid change presence and graphs over declared limits. The offline inspector derives the shortest import-dependent chain separately for base and head revisions. The list and summary visibly distinguish expected exclusions from incomplete output; the diagram recenters on any listed candidate.
