import React from 'react';
import PropTypes from 'prop-types';
import RenderFields from '../../RenderFields';
import withCondition from '../../withCondition';
import FieldTypeGutter from '../../FieldTypeGutter';
import { NegativeFieldGutterProvider } from '../../FieldTypeGutter/context';

import './index.scss';

const baseClass = 'group';

const Group = (props) => {
  const {
    label,
    fields,
    name,
    path: pathFromProps,
    fieldTypes,
    admin: {
      readOnly,
      style,
      width,
    },
  } = props;

  const path = pathFromProps || name;

  return (
    <div
      className="field-type group"
      style={{
        ...style,
        width,
      }}
    >
      <FieldTypeGutter />

      <div className={`${baseClass}__content-wrapper`}>
        {label && (
          <h2 className={`${baseClass}__title`}>{label}</h2>
        )}
        <div className={`${baseClass}__fields-wrapper`}>
          <NegativeFieldGutterProvider allow={false}>
            <RenderFields
              readOnly={readOnly}
              fieldTypes={fieldTypes}
              fieldSchema={fields.map((subField) => ({
                ...subField,
                path: `${path}${subField.name ? `.${subField.name}` : ''}`,
              }))}
            />
          </NegativeFieldGutterProvider>
        </div>
      </div>
    </div>
  );
};

Group.defaultProps = {
  label: '',
  path: '',
  admin: {},
};

Group.propTypes = {
  fields: PropTypes.arrayOf(
    PropTypes.shape({}),
  ).isRequired,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  path: PropTypes.string,
  fieldTypes: PropTypes.shape({}).isRequired,
  admin: PropTypes.shape({
    readOnly: PropTypes.bool,
    style: PropTypes.shape({}),
    width: PropTypes.string,
  }),
};

export default withCondition(Group);