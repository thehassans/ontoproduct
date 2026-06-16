import mongoose from 'mongoose';

const ComponentPropSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'color', 'image', 'select', 'json', 'array'],
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    options: { type: [String], default: undefined },
  },
  { _id: false }
);

const LayoutNodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    component: { type: String, required: true, index: true },
    props: { type: [ComponentPropSchema], default: [] },
    styles: { type: mongoose.Schema.Types.Mixed, default: {} },
    children: { type: [mongoose.Schema.Types.Mixed], default: [] },
    visibility: {
      desktop: { type: Boolean, default: true },
      tablet: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true },
    },
    meta: {
      label: { type: String, default: '' },
      icon: { type: String, default: '' },
      category: { type: String, default: 'general' },
    },
  },
  { _id: false }
);

LayoutNodeSchema.add({ children: [LayoutNodeSchema] });

const PageLayoutSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true },
    route: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    themeSlug: { type: String, default: null, index: true },
    scope: {
      type: String,
      enum: ['global', 'country'],
      default: 'global',
    },
    countryCode: { type: String, default: null, index: true },
    tree: { type: [LayoutNodeSchema], default: [] },
    meta: {
      author: { type: String, default: '' },
      lastModifiedBy: { type: String, default: '' },
      version: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

PageLayoutSchema.statics.getPublishedLayout = async function (route, countryCode = null) {
  const query = { route, status: 'published' };
  if (countryCode) {
    query.$or = [{ countryCode }, { scope: 'global' }];
  } else {
    query.scope = 'global';
  }
  return this.findOne(query).sort({ updatedAt: -1 }).lean();
};

export default mongoose.model('PageLayout', PageLayoutSchema);
