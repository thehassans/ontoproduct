# Visual Theme Builder

## Architecture

### Backend
- **Models:** `Theme`, `PageLayout`, `ThemeVersion` (Mongoose)
- **Routes:** `/api/theme-builder`
  - `GET /themes` — list themes
  - `GET /themes/:slug` — get theme by slug
  - `POST /themes` — create theme
  - `PATCH /themes/:slug/draft` — save draft
  - `PATCH /themes/:slug/publish` — publish theme
  - `POST /themes/:slug/rollback` — rollback to version
  - `GET /themes/:slug/versions` — list versions
  - `GET /layouts` — list page layouts
  - `GET /layouts/:slug` — get layout by slug
  - `POST /layouts` — create layout
  - `PATCH /layouts/:slug/draft` — save layout draft
  - `PATCH /layouts/:slug/publish` — publish layout
  - `GET /themes/active` — get active published config

### Frontend

#### Core Files
| File | Purpose |
|------|---------|
| `ComponentRegistry.js` | Maps JSON component names to generic React components |
| `SchemaRenderer.jsx` | Recursively parses JSON tree into React elements |
| `postMessageBridge.js` | Typed bidirectional postMessage protocol |
| `BuilderWorkspace.jsx` | Split-pane editor (controls + iframe preview) |
| `LivePreview.jsx` | iframe target that renders SchemaRenderer |

#### Component Registry
Registered components: `Container`, `Text`, `Heading`, `Button`, `Image`, `Link`, `Header`, `Footer`, `HeroBanner`, `ProductGrid`, `ProductCard`, `Navbar`, `Spacer`, `FlexRow`, `FlexCol`, `Grid`.

All components accept:
- `props` — parsed JSON props array
- `styles` — inline style object (with token resolution)
- `tokens` — global theme token array
- `onInteract` — callback for button actions

#### Live Preview Isolation
The preview runs in an iframe at `/theme-preview`. The builder at `/theme-builder` communicates via `postMessage` using the typed protocol in `postMessageBridge.js`. This keeps heavy builder state out of the e-commerce render cycle.

#### Theme Schema (JSON)
```json
{
  "name": "Summer Sale",
  "slug": "summer-sale",
  "tokens": [
    { "id": "color-primary", "type": "color", "value": "#ff4081" },
    { "id": "radius-md", "type": "borderRadius", "value": "12px" }
  ]
}
```

#### Page Layout Schema (JSON)
```json
{
  "name": "Homepage",
  "slug": "home",
  "route": "/",
  "tree": [
    {
      "id": "hero-1",
      "component": "HeroBanner",
      "props": [
        { "key": "heading", "type": "string", "value": "Big Sale" },
        { "key": "ctaText", "type": "string", "value": "Shop Now" }
      ],
      "styles": { "minHeight": "60vh" },
      "children": []
    }
  ]
}
```

### Adding New Components
1. Create the generic React component in `ComponentRegistry.js`.
2. Add it to the `COMPONENT_MAP` export.
3. Add a preset in `BuilderWorkspace.jsx` > `ComponentsPanel`.

### Security Notes
- The iframe uses `sandbox="allow-scripts allow-same-origin"`.
- postMessage uses a typed protocol; unknown message types are ignored.
