import { Where } from '../../types';
import { PayloadRequest } from '../../express/types';
import executeAccess from '../../auth/executeAccess';
import sanitizeInternalFields from '../../utilities/sanitizeInternalFields';
import { Collection, TypeWithID, PaginatedDocs } from '../config/types';
import { hasWhereAccessResult } from '../../auth/types';
import flattenWhereConstraints from '../../utilities/flattenWhereConstraints';

export type Arguments = {
  collection: Collection
  where?: Where
  page?: number
  limit?: number
  sort?: string
  depth?: number
  req?: PayloadRequest
  overrideAccess?: boolean
  showHiddenFields?: boolean
}

async function find<T extends TypeWithID = any>(incomingArgs: Arguments): Promise<PaginatedDocs<T>> {
  let args = incomingArgs;

  // /////////////////////////////////////
  // beforeOperation - Collection
  // /////////////////////////////////////

  await args.collection.config.hooks.beforeOperation.reduce(async (priorHook, hook) => {
    await priorHook;

    args = (await hook({
      args,
      operation: 'read',
    })) || args;
  }, Promise.resolve());

  const {
    where,
    page,
    limit,
    depth,
    collection: {
      Model,
      config: collectionConfig,
    },
    req,
    req: {
      locale,
    },
    overrideAccess,
    showHiddenFields,
  } = args;

  // /////////////////////////////////////
  // Access
  // /////////////////////////////////////

  const queryToBuild: { where?: Where } = {};
  let useEstimatedCount = false;

  if (where) {
    let and = [];

    if (Array.isArray(where.and)) and = where.and;
    if (Array.isArray(where.AND)) and = where.AND;

    queryToBuild.where = {
      ...where,
      and: [
        ...and,
      ],
    };

    const constraints = flattenWhereConstraints(queryToBuild);

    useEstimatedCount = constraints.some((prop) => Object.keys(prop)
      .some((key) => key === 'near'));
  }

  if (!overrideAccess) {
    const accessResults = await executeAccess({ req }, collectionConfig.access.read);

    if (hasWhereAccessResult(accessResults)) {
      if (!where) {
        queryToBuild.where = {
          and: [
            accessResults,
          ],
        };
      } else {
        (queryToBuild.where.and as Where[]).push(accessResults);
      }
    }
  }

  const query = await Model.buildQuery(queryToBuild, locale);

  // /////////////////////////////////////
  // Find
  // /////////////////////////////////////

  let sortProperty: string;
  let sortOrder = 'desc';

  if (!args.sort) {
    if (collectionConfig.timestamps) {
      sortProperty = 'createdAt';
    } else {
      sortProperty = '_id';
    }
  } else if (args.sort.indexOf('-') === 0) {
    sortProperty = args.sort.substring(1);
  } else {
    sortProperty = args.sort;
    sortOrder = 'asc';
  }

  if (sortProperty === 'id') sortProperty = '_id';

  const optionsToExecute = {
    page: page || 1,
    limit: limit || 10,
    sort: {
      [sortProperty]: sortOrder,
    },
    lean: true,
    leanWithId: true,
    useEstimatedCount,
    collation: {
      locale: 'pl',
      strength: 2,
    },
  };


  const collectionsAggregate = Model.aggregate([
    { $match: query },
  ], optionsToExecute);

  if (sortProperty.includes('.')) {
    collectionsAggregate
      .addFields({
        authors_backup: '$authors',
      })
      .unwind('authors_backup')
      .addFields({
        albumId: { $toObjectId: '$album.value' },
        authorId: { $toObjectId: '$authors_backup.value' },
      })
      .lookup({
        from: 'albums',
        localField: 'albumId',
        foreignField: '_id',
        as: 'album_docs',
      })
      .lookup({
        from: 'authors',
        localField: 'authorId',
        foreignField: '_id',
        as: 'author_docs',
      })
      .unwind('album_docs');
  }

  const paginatedDocs = await Model.aggregatePaginate(collectionsAggregate, optionsToExecute);

  // /////////////////////////////////////
  // beforeRead - Collection
  // /////////////////////////////////////

  let result = {
    ...paginatedDocs,
    docs: await Promise.all(paginatedDocs.docs.map(async (doc) => {
      const docString = JSON.stringify(doc);
      let docRef = JSON.parse(docString);

      await collectionConfig.hooks.beforeRead.reduce(async (priorHook, hook) => {
        await priorHook;

        docRef = await hook({
          req,
          query,
          doc: docRef
        }) || docRef;
      }, Promise.resolve());

      return docRef;
    })),
  } as PaginatedDocs<T>;

  // /////////////////////////////////////
  // afterRead - Fields
  // /////////////////////////////////////

  result = {
    ...result,
    docs: await Promise.all(result.docs.map(async (data) => this.performFieldOperations(
      collectionConfig,
      {
        depth,
        data,
        req,
        id: data.id,
        hook: 'afterRead',
        operation: 'read',
        overrideAccess,
        flattenLocales: true,
        showHiddenFields,
      },
      find,
    ))),
  };

  // /////////////////////////////////////
  // afterRead - Collection
  // /////////////////////////////////////

  result = {
    ...result,
    docs: await Promise.all(result.docs.map(async (doc) => {
      let docRef = doc;

      await collectionConfig.hooks.afterRead.reduce(async (priorHook, hook) => {
        await priorHook;

        docRef = await hook({
          req,
          query,
          doc
        }) || doc;
      }, Promise.resolve());

      return docRef;
    })),
  };

  // /////////////////////////////////////
  // Return results
  // /////////////////////////////////////

  result = {
    ...result,
    docs: result.docs.map((doc) => sanitizeInternalFields<T>(doc)),
  };

  return result;
}

export default find;
