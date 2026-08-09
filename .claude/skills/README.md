# Claude Code Skills

This folder contains custom skills for the Dashboard project. Each skill automates a workflow or provides specialized assistance.

## Folder Structure

```
.claude/skills/
├── README.md (this file)
├── SKILLS_TEMPLATE.md (template for creating new skills)
├── skill-name-1.md
├── skill-name-2.md
└── ... (add your custom skills here)
```

## Creating a New Skill

1. Copy `SKILLS_TEMPLATE.md` to a new file named `your-skill-name.md`
2. Fill in the frontmatter (name, description, type)
3. Write the skill instructions clearly
4. Save and it will be available for use via `/your-skill-name`

## Skill Types

- **dynamic**: Runs on-demand when invoked by the user
- **cron**: Runs on a schedule (use with `/schedule` command)
- **trigger**: Runs automatically based on conditions

## Your Custom Skills

Add your skill files here as you build them.