import yaml from 'js-yaml';

export function serializeFrontmatter(data, body) {
  const frontmatter = yaml.safeDump(data, {
    noRefs: true,
    lineWidth: -1,
  });

  return `---\n${frontmatter}---\n${body}`;
}