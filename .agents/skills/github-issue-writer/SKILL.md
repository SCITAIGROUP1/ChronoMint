---
name: github-issue-writer
description: Templates and guidelines for writing high-quality GitHub Issues (Features/Bugs) and Pull Request descriptions. Use this when the user asks to write a GitHub Issue, PR description, or feature request for a GitHub repository.
---

# GitHub Issue & PR Writing Skill

When a user asks you to write a GitHub Issue or Pull Request, use the appropriate template below. 

### 🤖 AUTOMATION RULE: Pushing to GitHub Project Board
You are equipped with a local synchronization script. After generating the markdown title and body for an Issue (Feature Request or Bug), you **MUST** execute the following terminal command to post it directly onto the user's GitHub Project board:
```bash
node .agents/scripts/github_project_sync.js --title "<Title>" --body "<Markdown Body>"
```
Ensure you escape quotes properly inside the command arguments.

---

## 1. Feature Request / Enhancement Issue (PM/Dev Perspective)

Use this format when proposing a new feature or enhancement in GitHub.

### **[Feature] Brief description of the feature**

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Acceptance Criteria:**
- [ ] AC1: ...
- [ ] AC2: ...

**Additional context**
Add any other context or screenshots about the feature request here.

---

## 2. Bug Report Issue (QA/User Perspective)

Use this format when reporting a defect in GitHub.

### **[Bug] Concise summary of the bug**

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.

---

## 3. Pull Request Template (Developer Perspective)

Use this format when writing a PR description to merge code.

### **Summary**
Briefly explain the changes made in this PR and why they were made. Closes #<Issue_Number>.

### **Changes**
- Added feature X
- Fixed bug Y in file Z
- Refactored component W

### **Testing Instructions**
1. Checkout this branch `git checkout <branch-name>`
2. Run `npm install` and `npm run dev`
3. Verify that [Feature/Fix] works as expected by doing [Action].

### **Checklist**
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
