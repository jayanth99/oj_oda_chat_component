import Composite = require('ojs/ojcomposite');
import * as view from 'text!./oj-oda-chat-view.html';
import viewModel from './oj-oda-chat-viewModel';
import * as metadata from 'text!./component.json';
import 'css!./oj-oda-chat-styles';

Composite.register('oj-oda-chat', {
    view: view,
    viewModel: viewModel,
    metadata: JSON.parse(metadata)
});
