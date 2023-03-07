import express from 'express';
import AppController from '../controllers/AppController';

const routerAPI = (api) => {
  api.get('/status', AppController.getStatus);
  api.get('/stats', AppController.getStats);
};

export default routerAPI;
