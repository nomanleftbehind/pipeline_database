import { useEffect, useState, useRef } from 'react';
import { ApolloError } from '@apollo/client';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import {
  useEditPipelineMutation,
  PipelinesByIdQueryDocument,
  useEditPigRunMutation,
  PigRunsByPipelineIdDocument,
  useEditPressureTestMutation,
  PressureTestsByPipelineIdDocument,
  useEditRiskMutation,
  RiskByIdDocument,
} from '../../graphql/generated/graphql';
import { IValidator, IRecord } from '../fields/PipelineProperties';
import { ITable } from '../rows/PipelineData';
import { useAuth } from '../../context/AuthContext';
import { TextInput, DOMSelectInput } from '../../pages/register';
import { Formik, Form, FormikHelpers, useField, FieldHookConfig } from 'formik';
import * as Yup from 'yup';


// We are taking `validators` type which is a union of many objects, a string and undefined.
// We are removing string and undefined and combining all objects into one object that contains all properties.
// This is because we we will use keys of this type to index validators.
type RemoveStringFromUnion<T> = T extends infer U ? string extends U ? never : U : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type IntersectionToObject<I> = UnionToIntersection<I> extends infer O ? { [K in keyof O]: O[K] } : never;

type IValidatorEnumsToOneObject = IntersectionToObject<UnionToIntersection<RemoveStringFromUnion<NonNullable<IValidator>>>>;

export type IColumnType = 'string' | 'number' | 'date' | 'boolean';

interface IValues {
  [x: string]: NonNullable<IRecord>;
}

export interface IEditRecord {
  id: string;
  columnName: string;
  columnType: IColumnType;
  newRecord: IRecord;
}

interface IRecordEntryProps {
  id: string;
  createdById: string;
  columnName: string;
  columnType: IColumnType;
  nullable: boolean;
  record: IRecord;
  validator?: IValidator;
  editRecord?: ({ id, columnName, columnType, newRecord }: IEditRecord) => void;
}

export default function RecordEntry({ id, createdById, columnName, columnType, nullable, record, validator, editRecord }: IRecordEntryProps) {
  const [edit, setEdit] = useState(false);
  const [selected, setSelected] = useState(false);
  const [valid, setValid] = useState(true);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, false);
    return () => {
      document.removeEventListener('click', handleClickOutside, false);
    };
  }, []);

  const handleClickOutside = (event: Event) => {
    const target = event.target as Node;
    if (ref.current && !ref.current.contains(target)) {
      setEdit(false);
      setSelected(false);
    }
  };

  const validatorIsObject = typeof validator === 'object' && !Array.isArray(validator) && validator !== null;

  // const validateForm = () => {
  //   if (typeof validator === 'string') {
  //     const validatorRegexp = new RegExp(validator);
  //     const isValid = validatorRegexp.test(state);
  //     setValid(isValid)
  //   } else {
  //     setValid(true);
  //   }
  // }

  const switchRecordDisplay = () => {
    switch (columnType) {
      case 'date':
        if (typeof record === 'string') {
          return record.slice(0, 10);
        } else {
          return record;
        }
      case 'boolean':
        if (typeof record === 'boolean') {
          // Material UI doesn't allow boolean values be displayed in it's components.
          return record === true ? 'Y' : 'N';
        } else {
          return record;
        }
      case 'string':
        if (typeof record === 'string') {
          if (validatorIsObject) {
            // Using previously defined object type that represents all validator properties.
            return (validator as IValidatorEnumsToOneObject)[record as keyof IValidatorEnumsToOneObject];
          } else {
            return record;
          }
        } else {
          return record;
        }
      default:
        return record;
    }
  }

  const recordDisplay = switchRecordDisplay();

  const validationSchema = Yup.object().shape({ [columnName]: Yup.string().required('required').nullable(true), });

  return (
    <div
      ref={ref}
      className='entry-field'
      tabIndex={-1}
      onDoubleClick={() => setEdit(true)}
      onClick={() => setSelected(true)}
    >{edit && editRecord ?
      <Formik
        initialValues={{
          [columnName]: record == null ? validatorIsObject ? Object.keys(validator)[0] : '' : (columnType === 'date' && typeof record === 'string') ? record.slice(0, 10) : record,
        }}
        validationSchema={validationSchema}
        onSubmit={(values: IValues, { setFieldError }: FormikHelpers<IValues>) => {
          try {
            editRecord({ id, columnName, columnType, newRecord: values[columnName] });
          } catch (err) {
            const apolloErr = err as ApolloError;
            setFieldError(columnName, apolloErr.message);
          }
          setEdit(false);
          setSelected(false);
        }
        }
      >
        {({ errors, touched, isSubmitting }) => {

          return (
            <Form
              className='entry-field-form'
            >
              {validatorIsObject ?
                <DOMSelectInput
                  className='record-entry-select'
                  name={columnName}
                >
                  {validator && Object
                    .entries(validator)
                    .map(([validatorServer, validatorDatabase]) => <option
                      key={validatorServer}
                      value={validatorServer}
                    >
                      {validatorDatabase}
                    </option>)}
                </DOMSelectInput> :
                <TextInput
                  name={columnName}
                  type={columnType === 'date' ? 'date' : columnType === 'number' ? 'number' : 'text'}
                  autoComplete='off'
                />}
              <div>
                <IconButton aria-label='submit cell' size='small' type='submit' disabled={!valid}>
                  <CheckCircleOutlineIcon />
                </IconButton>
              </div>
            </Form>
          )
        }}
      </Formik> :
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {recordDisplay}
        </div>
        {nullable && editRecord && selected && <div>
          <IconButton aria-label="expand row" size="small" onClick={() => editRecord({ id, columnName, columnType, newRecord: null })}>
            <BlockOutlinedIcon />
          </IconButton>
        </div>}
      </div>}
    </div>

  );
}