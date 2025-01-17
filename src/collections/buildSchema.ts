import paginate from 'mongoose-paginate-v2';
import { Schema } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { SanitizedConfig } from '../config/types';
import buildQueryPlugin from '../mongoose/buildQuery';
import buildSchema from '../mongoose/buildSchema';
import { SanitizedCollectionConfig } from './config/types';


const buildCollectionSchema = (collection: SanitizedCollectionConfig, config: SanitizedConfig, schemaOptions = {}): Schema => {
  const schema = buildSchema(
    config,
    collection.fields,
    {
      options: { timestamps: collection.timestamps !== false, ...schemaOptions },
    },
  );

  schema
    .plugin(paginate, { useEstimatedCount: true })
    .plugin(aggregatePaginate)
    .plugin(buildQueryPlugin);

  return schema;
};

export default buildCollectionSchema;
