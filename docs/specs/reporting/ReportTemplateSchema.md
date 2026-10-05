# Report Template Schema Specification — Enterprise Report Templates
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, BE Lead, QA Lead

Objective
Define a comprehensive JSON schema for report templates that supports metadata, sections, fields, data bindings (e.g., {{project_name}}), conditionals, branding assets, and multi-format output. Enables template-driven report generation with flexibility and maintainability.

Non-Functional Requirements
- Flexibility: Support multiple report types (revenue, conversion, customer, profitability, pipeline, executive)
- Maintainability: JSON-based schema for easy template creation and updates
- Performance: Template validation and rendering must be fast (< 100ms)
- Extensibility: Support custom sections, fields, and bindings
- Security: Template validation to prevent injection; safe binding evaluation

Schema Structure

Report Template JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metadata", "sections"],
  "properties": {
    "metadata": { "$ref": "#/definitions/Metadata" },
    "sections": { "$ref": "#/definitions/Sections" },
    "branding": { "$ref": "#/definitions/Branding" },
    "styles": { "$ref": "#/definitions/Styles" }
  }
}
```

Template Components

Metadata
- id: Template identifier (string, required)
- name: Template display name (string, required)
- description: Template description (string, optional)
- version: Template version (string, required, e.g., "1.0.0")
- category: Template category (enum: revenue, conversion, customer, profitability, pipeline, executive, custom)
- author: Template author (string, optional)
- createdAt: Creation timestamp (ISO 8601, optional)
- updatedAt: Last update timestamp (ISO 8601, optional)

Sections
- Array of section objects
- Each section: header, content, fields, conditionals
- Sections render in order
- Sections can be conditionally displayed

Fields
- Field definitions within sections
- Data bindings: {{variable_name}} syntax
- Field types: text, number, currency, date, percentage, table, chart
- Formatting options per field type

Bindings
- Variable references: {{variable_name}}
- Nested bindings: {{project.customer.name}}
- Array bindings: {{items[0].name}}
- Conditional bindings: {{#if condition}}...{{/if}}
- Loop bindings: {{#each items}}...{{/each}}

Conditionals
- Show/hide sections based on data
- Conditional formatting
- Conditional field inclusion
- Boolean expressions: {{#if revenue > 1000}}...{{/if}}

Branding Assets
- Logo URL or base64
- Color scheme
- Font preferences
- Header/footer templates

TypeScript Interface
```typescript
export interface ReportTemplate {
  metadata: TemplateMetadata;
  sections: Section[];
  branding?: Branding;
  styles?: Styles;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  category: TemplateCategory;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TemplateCategory =
  | 'revenue'
  | 'conversion'
  | 'customer'
  | 'profitability'
  | 'pipeline'
  | 'executive'
  | 'custom';

export interface Section {
  id: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  content?: string;
  fields?: Field[];
  condition?: Conditional;
  order: number;
}

export type SectionType =
  | 'header'
  | 'summary'
  | 'table'
  | 'chart'
  | 'text'
  | 'metrics'
  | 'footer';

export interface Field {
  id: string;
  type: FieldType;
  label?: string;
  binding: string;  // e.g., "{{revenue.total}}"
  format?: FieldFormat;
  condition?: Conditional;
}

export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'percentage'
  | 'table'
  | 'chart'
  | 'image';

export interface FieldFormat {
  currency?: {
    code: string;  // e.g., "USD", "EGP"
    symbol?: string;
  };
  date?: {
    format: string;  // e.g., "YYYY-MM-DD", "MM/DD/YYYY"
  };
  number?: {
    decimals?: number;
    thousandsSeparator?: string;
  };
  percentage?: {
    decimals?: number;
  };
}

export interface Conditional {
  expression: string;  // e.g., "revenue > 1000"
  operator?: 'if' | 'unless' | 'equals' | 'greater' | 'less';
}

export interface Branding {
  logo?: {
    url?: string;
    base64?: string;
    position?: 'header' | 'footer' | 'watermark';
    size?: 'small' | 'medium' | 'large';
  };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  header?: {
    template?: string;  // HTML or text template
    bindings?: string[];  // Variables to bind
  };
  footer?: {
    template?: string;
    bindings?: string[];
  };
}

export interface Styles {
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  fonts?: {
    heading?: FontStyle;
    body?: FontStyle;
  };
}

export interface FontStyle {
  family?: string;
  size?: number;
  weight?: 'normal' | 'bold';
  color?: string;
}
```

Binding Syntax

Variable Binding
- Simple: `{{variable_name}}`
- Nested: `{{project.customer.name}}`
- Array index: `{{items[0].name}}`
- Array length: `{{items.length}}`

Conditional Binding
- If: `{{#if condition}}content{{/if}}`
- Unless: `{{#unless condition}}content{{/unless}}`
- If-else: `{{#if condition}}true{{else}}false{{/if}}`

Loop Binding
- Each: `{{#each items}}{{name}}{{/each}}`
- With index: `{{#each items}}{{@index}}: {{name}}{{/each}}`

Helper Functions
- Format currency: `{{formatCurrency revenue "USD"}}`
- Format date: `{{formatDate created_at "YYYY-MM-DD"}}`
- Format number: `{{formatNumber count 2}}`
- Calculate: `{{calculate "revenue * 0.14"}}` (VAT calculation)

Template Examples

Revenue Summary Template
```json
{
  "metadata": {
    "id": "revenue-summary",
    "name": "Revenue Summary",
    "description": "Monthly revenue overview with trends",
    "version": "1.0.0",
    "category": "revenue"
  },
  "sections": [
    {
      "id": "header",
      "type": "header",
      "title": "Revenue Summary Report",
      "subtitle": "{{period.start}} to {{period.end}}",
      "order": 1
    },
    {
      "id": "summary",
      "type": "metrics",
      "title": "Summary",
      "fields": [
        {
          "id": "total-revenue",
          "type": "currency",
          "label": "Total Revenue",
          "binding": "{{revenue.total}}",
          "format": { "currency": { "code": "USD" } }
        },
        {
          "id": "average-revenue",
          "type": "currency",
          "label": "Average Daily Revenue",
          "binding": "{{revenue.average}}",
          "format": { "currency": { "code": "USD" } }
        }
      ],
      "order": 2
    },
    {
      "id": "chart",
      "type": "chart",
      "title": "Revenue Trend",
      "binding": "{{revenue.chartData}}",
      "chartType": "line",
      "order": 3
    }
  ],
  "branding": {
    "logo": {
      "position": "header",
      "size": "medium"
    },
    "colors": {
      "primary": "#fbbf24",
      "secondary": "#0f172a"
    }
  }
}
```

Conversion Analysis Template
```json
{
  "metadata": {
    "id": "conversion-analysis",
    "name": "Conversion Analysis",
    "version": "1.0.0",
    "category": "conversion"
  },
  "sections": [
    {
      "id": "summary",
      "type": "metrics",
      "fields": [
        {
          "id": "conversion-rate",
          "type": "percentage",
          "label": "Conversion Rate",
          "binding": "{{conversion.rate}}",
          "format": { "percentage": { "decimals": 2 } }
        },
        {
          "id": "total-quotes",
          "type": "number",
          "label": "Total Quotes",
          "binding": "{{conversion.totalQuotes}}"
        },
        {
          "id": "accepted-quotes",
          "type": "number",
          "label": "Accepted Quotes",
          "binding": "{{conversion.accepted}}"
        }
      ],
      "order": 1
    },
    {
      "id": "breakdown",
      "type": "table",
      "title": "Status Breakdown",
      "binding": "{{conversion.breakdown}}",
      "columns": [
        { "key": "status", "label": "Status" },
        { "key": "count", "label": "Count" },
        { "key": "percentage", "label": "Percentage" }
      ],
      "order": 2
    }
  ]
}
```

Validation Rules

Schema Validation
- Validate against JSON schema
- Required fields must be present
- Field types must be valid
- Bindings must reference valid variables

Binding Validation
- Bindings must use valid syntax
- Variables must exist in data context
- Nested paths must be valid
- Array indices must be within bounds

Conditional Validation
- Conditional expressions must be valid
- Operators must be supported
- Values must be comparable

Security Validation
- Prevent code injection in bindings
- Sanitize template content
- Validate data types
- Restrict helper function usage

Implementation Notes

Template Engine
- Use template engine (Handlebars, Mustache, or custom)
- Support binding syntax defined above
- Cache compiled templates
- Validate templates before rendering

Data Context
- Provide data context for bindings
- Structure data to match template expectations
- Handle missing data gracefully
- Support nested data structures

Rendering
- Render sections in order
- Apply conditionals before rendering
- Format fields according to format specifications
- Apply branding and styles

Performance
- Cache compiled templates
- Optimize binding evaluation
- Lazy load sections if needed
- Minimize template size

Testing Requirements

Unit Tests
- Schema validation
- Binding evaluation
- Conditional logic
- Field formatting
- Template compilation

Integration Tests
- Template rendering with data
- Multi-section templates
- Conditional sections
- Branding application

Acceptance Criteria
- Templates validate against schema
- Bindings evaluate correctly
- Conditionals work as expected
- Formatting applies correctly
- Branding renders properly
- Templates are secure (no injection)
- Performance meets targets (< 100ms validation)
