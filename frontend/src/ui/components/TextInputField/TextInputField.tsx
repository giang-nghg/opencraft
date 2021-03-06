import * as React from 'react';
import { FormControl, FormGroup, FormLabel } from 'react-bootstrap';
import { WrappedMessage } from 'utils/intl';
import './styles.scss';

interface InputFieldProps {
  fieldName: string;
  value?: string;
  onChange?: any;
  onBlur?: any;
  error?: string;
  messages: any;
  type?: string;
  isValid?: boolean;
  loading?: boolean;
  reset?: Function;
  autoComplete?: string;
}

export const TextInputField: React.FC<InputFieldProps> = (
  props: InputFieldProps
) => {
  const hasHelpMessage = `${props.fieldName}Help` in props.messages;

  return (
    <div className="text-input-container">
      <FormGroup>
        <FormLabel>
          <WrappedMessage id={props.fieldName} messages={props.messages} />
        </FormLabel>
        <FormControl
          name={props.fieldName}
          value={props.value}
          disabled={props.loading}
          onChange={props.onChange}
          onBlur={props.onBlur}
          type={props.type}
          isInvalid={!!props.error}
          isValid={props.isValid}
          autoComplete={props.autoComplete}
        />
        {props.error && (
          <FormControl.Feedback type="invalid">
            {props.error}
          </FormControl.Feedback>
        )}
        {hasHelpMessage && (
          <p>
            <WrappedMessage
              id={`${props.fieldName}Help`}
              messages={props.messages}
            />
          </p>
        )}
      </FormGroup>

      {props.reset !== undefined && (
        <p>
          <button
            className="reset-default"
            type="button"
            onClick={() => {
              // Using `!` because we know this will never be called
              // if props.reset is undefined (this component won't be
              // rendered).
              props.reset!();
            }}
          >
            Reset
          </button>
        </p>
      )}
    </div>
  );
};
