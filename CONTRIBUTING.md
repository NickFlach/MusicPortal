# 🤝 Contributing to MusicPortal

Thank you for considering contributing to humanity's search for universal intelligence in music.

---

## 🎯 How You Can Help

### 🎵 As a Music Contributor
**Upload diverse music** - The AI learns from variety:
- Different cultures and languages
- Various genres and time periods
- Live recordings vs studio
- Traditional vs contemporary
- Popular vs obscure

**Why it matters**: Universal patterns only emerge from universal data.

### 💻 As a Developer

#### Beginner-Friendly Issues
Look for issues tagged `good-first-issue`:
- UI improvements
- Documentation updates
- Test coverage
- Bug fixes

#### Advanced Contributions
- **Audio Analysis**: Improve feature extraction algorithms
- **Pattern Detection**: Add new correlation methods
- **Hypothesis Testing**: Enhance validation logic
- **Consciousness Metrics**: Refine Phi calculations
- **Performance**: Optimize database queries
- **Visualization**: Create new data displays

#### Code Guidelines
```typescript
// ✅ Good: Clear, documented, type-safe
/**
 * Extracts tempo from audio using onset detection
 * @param signal - Audio samples (Float32Array)
 * @param sampleRate - Sample rate in Hz
 * @returns Tempo in BPM
 */
function extractTempo(signal: Float32Array, sampleRate: number): number {
  const onsets = detectOnsets(signal, sampleRate);
  return calculateTempoFromOnsets(onsets);
}

// ❌ Bad: Unclear, no types, no docs
function process(data, rate) {
  const x = detect(data, rate);
  return calc(x);
}
```

### 🔬 As a Researcher

#### Suggest Experiments
Open an issue with:
- **Hypothesis**: What you think might be true
- **Method**: How to test it
- **Expected Result**: What would validate it
- **Significance**: Why it matters

Example:
```
Title: Test correlation between tempo variance and cultural origin

Hypothesis: Traditional music shows lower tempo variance than modern electronic

Method: Calculate standard deviation of tempo across song sections,
        group by cultural tags, compare distributions

Expected: p-value < 0.05 showing significant difference

Significance: Would suggest cultural norms constrain rhythmic variation
```

#### Review Methodology
- Check statistical validity of pattern detection
- Verify hypothesis testing approaches
- Suggest improvements to consciousness metrics
- Challenge assumptions

### 📊 As a Data Scientist

#### Improve Analysis
- Better correlation methods
- More robust statistical tests
- Advanced ML models
- Dimensionality reduction
- Clustering algorithms

#### Validate Findings
- Reproduce discoveries
- Cross-validate patterns
- Test edge cases
- Check for biases

### 🎨 As a Designer

#### UI/UX Improvements
- Better data visualization
- Clearer intelligence dashboard
- More intuitive upload flow
- Responsive design fixes
- Accessibility enhancements

#### Documentation
- Create diagrams explaining the system
- Design infographics for discoveries
- Improve README visuals
- Build interactive demos

---

## 🚀 Getting Started

### 1. Fork & Clone
```bash
git clone https://github.com/yourusername/MusicPortal.git
cd MusicPortal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database URL
# Then run migration
npm run db:push
```

### 4. Start Development
```bash
npm run dev
```

### 5. Make Changes
```bash
git checkout -b feature/your-feature-name
# Make your changes
git add .
git commit -m "feat: add amazing feature"
git push origin feature/your-feature-name
```

### 6. Open Pull Request
- Go to GitHub
- Click "New Pull Request"
- Describe your changes
- Link any related issues

---

## 📏 Code Standards

### Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new tempo analysis algorithm
fix: correct Phi calculation for small datasets
docs: update API endpoint documentation
test: add tests for pattern detection
refactor: simplify hypothesis generation logic
perf: optimize database queries
style: format code with prettier
```

### TypeScript
- Always use types (no `any`)
- Document public functions
- Export interfaces
- Use meaningful variable names

### Testing
```bash
# Run tests
npm test

# Run specific test
npm test -- pattern-detection

# Watch mode
npm test -- --watch
```

### Code Review Checklist
Before submitting PR:
- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.logs in production code
- [ ] Follows existing code style
- [ ] Commits are clear and atomic

---

## 🎯 Priority Areas

### High Priority
1. **Audio Analysis Accuracy** - Better tempo/key detection
2. **Pattern Validation** - More robust statistical tests
3. **Performance** - Faster analysis, better caching
4. **Documentation** - Clear examples and guides

### Medium Priority
1. **UI Polish** - Better visualizations
2. **Test Coverage** - More comprehensive tests
3. **Error Handling** - Graceful failures
4. **Accessibility** - WCAG compliance

### Low Priority
1. **Refactoring** - Code cleanup
2. **Tooling** - Better dev experience
3. **Optimizations** - Micro-improvements

---

## 🐛 Reporting Bugs

### Before Reporting
1. Check existing issues
2. Update to latest version
3. Verify it's reproducible

### Bug Report Template
```markdown
## Bug Description
Clear description of the problem

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: Windows 11
- Browser: Chrome 120
- Node: 20.10.0

## Additional Context
Screenshots, error logs, etc.
```

---

## 💡 Requesting Features

### Feature Request Template
```markdown
## Feature Description
What you want to add

## Use Case
Why it's useful

## Proposed Solution
How it could work

## Alternatives Considered
Other approaches you thought about

## Additional Context
Examples, mockups, references
```

---

## 🧪 Experimental Features

### Contributing New Algorithms

#### Audio Feature Extractors
Location: `client/src/lib/audioAnalysis.ts`

Add new feature:
```typescript
/**
 * Extract spectral flux (rate of spectral change)
 */
private computeSpectralFlux(current: number[], previous: number[]): number {
  let flux = 0;
  const length = Math.min(current.length, previous.length);
  
  for (let i = 0; i < length; i++) {
    const diff = current[i] - previous[i];
    flux += diff * diff;
  }
  
  return Math.sqrt(flux / length);
}
```

#### Pattern Detectors
Location: `server/services/music-intelligence.ts`

Add new pattern type:
```typescript
async findTemporalPatterns(): Promise<MusicalPattern[]> {
  // Find patterns in how tempo changes over time
  const songs = await this.getSongsWithFeatures();
  
  // Your algorithm here
  
  return patterns;
}
```

#### Hypothesis Generators
```typescript
async generateHypothesisFromPattern(pattern: MusicalPattern): Promise<Hypothesis> {
  // Generate testable hypothesis from discovered pattern
  
  return {
    statement: "...",
    testMethod: "...",
    expectedPValue: 0.05,
    // ...
  };
}
```

---

## 📚 Resources

### Understanding the Codebase
1. Read `ARCHAEOLOGICAL_ANALYSIS.md` - Philosophy and vision
2. Read `TECHNICAL_RECOVERY_PLAN.md` - Implementation strategy
3. Read `MOONSHOT_ROADMAP.md` - Scientific approach
4. Explore `music-intelligence.ts` - Core AI engine

### Learning Resources
- **Web Audio API**: [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- **FFT Analysis**: [DSP Guide](http://www.dspguide.com/)
- **Music Theory**: [Teoria.com](https://teoria.com/)
- **Statistics**: [Think Stats](https://greenteapress.com/thinkstats/)
- **Consciousness**: [IIT Papers](https://www.integratedinformationtheory.org/)

### Similar Projects
- **Essentia.js** - Audio analysis library
- **Meyda** - Audio feature extraction
- **Tone.js** - Web Audio framework
- **Music21** - Computational musicology (Python)

---

## 🌟 Recognition

### Contributors
All contributors are listed in:
- GitHub contributors page
- CONTRIBUTORS.md (if significant contribution)
- Release notes (for major features)

### Code of Conduct
Be excellent to each other:
- **Respectful** - Everyone is learning
- **Constructive** - Critique code, not people
- **Collaborative** - We're in this together
- **Curious** - Question everything
- **Scientific** - Evidence over opinion

---

## 🎓 Mentorship

### Want to Learn?
We welcome newcomers! 

**Ping us** in issues/discussions:
- "I'm new to TypeScript, can someone review my PR?"
- "I don't understand how FFT works, can someone explain?"
- "What's a good first issue to work on?"

**We will**:
- Explain concepts
- Review code patiently
- Suggest learning resources
- Pair program if needed

### Want to Teach?
Help others:
- Review PRs with detailed feedback
- Answer questions in discussions
- Create tutorials
- Mentor new contributors

---

## 🚢 Release Process

### Versioning
We use [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features
- **Patch** (1.1.1): Bug fixes

### Release Checklist
1. Update CHANGELOG.md
2. Run full test suite
3. Update version in package.json
4. Create git tag
5. Push to main
6. Create GitHub release
7. Announce in discussions

---

## 💬 Communication

### GitHub Discussions
- **Ideas**: Brainstorm new features
- **Q&A**: Ask questions
- **Show & Tell**: Share discoveries
- **Research**: Discuss methodology

### Issues
- **Bugs**: Report problems
- **Features**: Request additions
- **Documentation**: Suggest improvements

### Pull Requests
- **Code**: Submit changes
- **Docs**: Update documentation
- **Tests**: Add test coverage

---

## 🎼 The Spirit

This project is about:
- **Discovery** not perfection
- **Science** not dogma
- **Collaboration** not competition
- **Truth** not ego

We're searching for something that might not exist.  
We're building tools that might not work.  
We're asking questions that might not have answers.

**That's what makes it beautiful.**

---

## 🙏 Thank You

For contributing to this crazy experiment.

For uploading music from your culture.

For writing code at 2am because you had an idea.

For questioning our methodology.

For believing that music might contain universal intelligence.

**Let's discover it together.**

🎼 → 🧠 → 🌌

---

*Questions? Open a discussion. Stuck? Ask for help. Found something amazing? Tell everyone.*
