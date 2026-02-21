const parseVersionContent = (content) => {
    if (content == null) return {};

    if (typeof content === 'string') {
        try {
            return JSON.parse(content);
        } catch {
            return {};
        }
    }

    return typeof content === 'object' ? content : {};
};

const stripHtml = (value = '') => {
    return String(value)
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/p\s*>/gi, '\n')
        .replace(/<\s*li[^>]*>/gi, '- ')
        .replace(/<\s*\/li\s*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const toComparableString = (value) => {
    if (value == null) return '';

    if (typeof value === 'string') {
        const cleaned = /<[^>]+>/.test(value) ? stripHtml(value) : value;
        return cleaned.replace(/\s+/g, ' ').trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => toComparableString(entry)).filter(Boolean).join(' | ').trim();
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value).trim();
};

const flattenGeneric = (value, prefix, output) => {
    if (value == null) return;

    if (Array.isArray(value)) {
        value.forEach((entry, index) => {
            const nextPrefix = `${prefix}[${index + 1}]`;
            flattenGeneric(entry, nextPrefix, output);
        });
        return;
    }

    if (typeof value === 'object') {
        Object.entries(value).forEach(([key, nested]) => {
            const nextPrefix = prefix ? `${prefix}.${key}` : key;
            flattenGeneric(nested, nextPrefix, output);
        });
        return;
    }

    const normalized = toComparableString(value);
    if (!normalized || !prefix) return;
    output[prefix] = normalized;
};

const getSectionKey = (section, index) => {
    const raw = section?.id || section?.title || `section-${index + 1}`;
    return String(raw)
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
};

const flattenSection = (section, index, output) => {
    if (!section || typeof section !== 'object') return;

    const sectionKey = getSectionKey(section, index);
    const { type, content } = section;

    if (type === 'personal' && content && typeof content === 'object') {
        Object.entries(content).forEach(([fieldKey, value]) => {
            const normalized = toComparableString(value);
            if (!normalized) return;
            output[`${sectionKey}.${fieldKey}`] = normalized;
        });
        return;
    }

    if (type === 'text') {
        const normalized = toComparableString(content);
        if (!normalized) return;
        output[sectionKey] = normalized;
        return;
    }

    if (type === 'list' && Array.isArray(content)) {
        content.forEach((item, itemIndex) => {
            const itemPrefix = `${sectionKey}[${itemIndex + 1}]`;

            if (item && typeof item === 'object') {
                Object.entries(item).forEach(([fieldKey, value]) => {
                    if (fieldKey === 'id') return;
                    const normalized = toComparableString(value);
                    if (!normalized) return;
                    output[`${itemPrefix}.${fieldKey}`] = normalized;
                });
                return;
            }

            const normalized = toComparableString(item);
            if (!normalized) return;
            output[itemPrefix] = normalized;
        });
        return;
    }

    flattenGeneric(content, sectionKey, output);
};

export const flattenResumeFields = (snapshot) => {
    const content = parseVersionContent(snapshot);
    const output = {};

    if (!content || typeof content !== 'object') {
        return output;
    }

    if (Array.isArray(content.sections)) {
        content.sections.forEach((section, index) => flattenSection(section, index, output));
        return output;
    }

    flattenGeneric(content, '', output);
    return output;
};

export const diffFieldMaps = (beforeMap = {}, afterMap = {}) => {
    const fieldSet = new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]);
    const fields = Array.from(fieldSet).sort((a, b) => a.localeCompare(b));

    return fields
        .map((field) => {
            const before = beforeMap[field] || '';
            const after = afterMap[field] || '';

            if (before === after) return null;

            let type = 'modified';
            if (!before && after) type = 'added';
            if (before && !after) type = 'removed';

            return {
                field,
                before,
                after,
                type,
            };
        })
        .filter(Boolean);
};

const sortVersionsAscending = (versions = []) => {
    return [...versions].sort((a, b) => {
        if (typeof a?.version === 'number' && typeof b?.version === 'number') {
            return a.version - b.version;
        }

        const aDate = new Date(a?.createdAt || 0).getTime();
        const bDate = new Date(b?.createdAt || 0).getTime();
        return aDate - bDate;
    });
};

export const buildFieldChangeCommits = (versions = []) => {
    const orderedVersions = sortVersionsAscending(versions).map((version) => ({
        ...version,
        fieldMap: flattenResumeFields(version?.content),
    }));

    const commits = orderedVersions.map((version, index) => {
        const previous = orderedVersions[index - 1];
        const previousFields = previous?.fieldMap || {};
        const changes = diffFieldMaps(previousFields, version.fieldMap);

        const stats = {
            added: changes.filter((change) => change.type === 'added').length,
            removed: changes.filter((change) => change.type === 'removed').length,
            modified: changes.filter((change) => change.type === 'modified').length,
        };

        return {
            id: version.id,
            version: version.version,
            createdAt: version.createdAt,
            message: version.commitMsg || `Version ${version.version}`,
            hash: version.id ? String(version.id).slice(0, 8) : 'unknown',
            changes,
            stats,
            totalChangedFields: changes.length,
        };
    });

    return commits.sort((a, b) => {
        if (typeof a.version === 'number' && typeof b.version === 'number') {
            return b.version - a.version;
        }

        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate;
    });
};

export const buildFieldHotspots = (commits = []) => {
    const countsByField = {};

    commits.forEach((commit) => {
        const safeChanges = Array.isArray(commit?.changes) ? commit.changes : [];
        safeChanges.forEach((change) => {
            if (!change?.field) return;

            if (!countsByField[change.field]) {
                countsByField[change.field] = {
                    field: change.field,
                    count: 0,
                    added: 0,
                    removed: 0,
                    modified: 0,
                };
            }

            countsByField[change.field].count += 1;
            countsByField[change.field][change.type] += 1;
        });
    });

    return Object.values(countsByField).sort((a, b) => {
        if (b.count === a.count) {
            return a.field.localeCompare(b.field);
        }
        return b.count - a.count;
    });
};
